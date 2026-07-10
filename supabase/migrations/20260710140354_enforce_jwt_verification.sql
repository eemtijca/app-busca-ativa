-- ============================================================
-- Migration: enforce_jwt_verification
-- Descrição:
--   1. Cria function db_pre_request que rejeita requests sem JWT
--   2. Registra a function como pre-request hook do PostgREST
--   3. Revoga EXECUTE da function pertence_grupo para anon/public
--
-- SEGURANÇA:
--   A function requisicao_exige_jwt é SECURITY DEFINER e rejeita
--   qualquer request cujo papel JWT seja 'anon' ou nulo (ausente).
--   Isto garante que mesmo com a chave pública (anon key), um JWT
--   válido seja obrigatório no header Authorization.
--
-- REFERÊNCIA:
--   https://supabase.com/docs/guides/api/securing-your-api
-- ============================================================

-- ----------------------------
-- 1. Function de pré-requisição
-- ----------------------------
create or replace function public.requisicao_exige_jwt()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text;
begin
  jwt_role := current_setting('request.jwt.claims', true)::json->>'role';

  if jwt_role is null or jwt_role = 'anon' then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code',    'PGRST401',
        'message', 'Token JWT ausente ou inválido. Autentique-se para acessar a API.'
      )::text,
      detail = json_build_object(
        'status',  401,
        'headers', json_build_object()
      )::text;
  end if;
end;
$$;

-- NOTA: Não revogamos EXECUTE desta function porque a db_pre_request
-- é executada com o papel da requisição (anon, authenticated, etc.),
-- NÃO como authenticator. A própria function faz a verificação de
-- segurança via request.jwt.claims, rejeitando requests sem JWT válido.
-- Mantém-se o GRANT padrão (PUBLIC) para que PostgREST possa chamá-la
-- internamente em qualquer request.

-- ----------------------------
-- 2. Registra como pre-request hook
-- ----------------------------
alter role authenticator set pgrst.db_pre_request = 'public.requisicao_exige_jwt';
notify pgrst, 'reload config';

-- ============================================================
-- 3. Segurança adicional: revoga EXECUTE de pertence_grupo
--    A function é SECURITY DEFINER em public, executável por
--    qualquer role (anon, authenticated, public) sem esta revogação.
-- Mantém acesso para authenticated (usado nas policies) e
-- revoga apenas de anon, NÃO de public (que inclui todas as roles).
-- ============================================================
revoke execute on function public.pertence_grupo from anon;
