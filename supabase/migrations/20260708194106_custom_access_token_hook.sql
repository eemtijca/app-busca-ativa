-- ============================================================
-- Migration: custom_access_token_hook
-- Descrição: Cria o Custom Access Token Auth Hook do Supabase
--            para injetar claims nome e papel no JWT.
--
-- FUNÇÃO:
--   Toda vez que um JWT é emitido (login, refresh, etc.),
--   esta função é executada. Ela busca o nome e papel do
--   usuário na tabela perfis e os injeta como claims no JWT.
--
-- SEGURANÇA:
--   - SECURITY DEFINER com search_path = '' (previne SQL injection)
--   - Apenas supabase_auth_admin pode executar a função
--   - NÃO usa raw_user_meta_data (editável pelo usuário)
--   - Claims são adicionadas ao app_metadata do JWT
--
-- REFERÊNCIA:
--   https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
--   https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac
-- ============================================================

-- Cria a função hook que será invocada antes de emitir o JWT
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
  declare
    claims jsonb;
    perfil_nome text;
    perfil_papel text;
  begin
    -- Busca nome e papel do usuário na tabela perfis
    select p.nome, p.papel into perfil_nome, perfil_papel
    from public.perfis p
    where p.id = (event->>'user_id')::uuid;

    -- Se não encontrou perfil, retorna o evento original sem modificar
    if not found then
      return event;
    end if;

    -- Obtém as claims existentes
    claims := event->'claims';

    -- Injeta nome e papel no app_metadata do JWT
    -- Estes valores NÃO são editáveis pelo usuário (ao contrário de raw_user_meta_data)
    claims := jsonb_set(claims, '{nome}', to_jsonb(perfil_nome));
    claims := jsonb_set(claims, '{papel}', to_jsonb(perfil_papel));

    -- Atualiza o evento com as novas claims
    event := jsonb_set(event, '{claims}', claims);

    return event;
  end;
$$;

-- Concede permissão de execução APENAS ao supabase_auth_admin
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- Revoga de todos os outros papéis (não expor como API pública)
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- Script para ATIVAR o hook no Studio (executar manualmente no SQL Editor:
-- http://127.0.0.1:54323/project/default/sql)
--
-- Alternativamente, configurar em supabase/config.toml:
-- [auth.hook.custom_access_token]
-- enabled = true
-- uri = "pg-functions://postgres/public/custom_access_token_hook"
