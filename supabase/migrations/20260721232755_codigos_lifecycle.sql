-- ============================================================================
-- Migration: codigos_lifecycle
-- Descricao: Aprimora o ciclo de vida dos codigos de redefinicao:
--   1. Aceita perfil pendente na geracao
--   2. Evita duplicacao de codigos ativos para o mesmo perfil
--   3. Adiciona funcao de revogacao
--   4. Adiciona coluna revogado_em para auditoria
-- ============================================================================

-- ============================================================================
-- 1. COLUNA REVOGADO_EM
-- ============================================================================
alter table public.codigos_redefinicao
  add column if not exists revogado_em timestamptz;

comment on column public.codigos_redefinicao.revogado_em is
  'Preenchido quando um admin revoga manualmente o codigo antes da expiracao natural.';

-- ============================================================================
-- 2. FUNCAO — GERAR CODIGO (REVISADA)
-- ============================================================================
-- Mudancas:
--   - Aceita perfis com status 'ativo' ou 'pendente'
--   - Retorna codigo ativo existente em vez de criar duplicata
-- ============================================================================

create or replace function public.fn_gerar_codigo_redefinicao(
  p_perfil_id uuid,
  p_criado_por uuid default auth.uid()
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_email  text;
  v_existente text;
begin
  if public.get_user_papel() != 'gestao' then
    raise exception 'Apenas a gestao pode gerar codigos de redefinicao.';
  end if;

  -- Verifica se ja existe codigo ativo para este perfil
  select codigo into v_existente
  from public.codigos_redefinicao
  where perfil_id = p_perfil_id
    and usado_em is null
    and expira_em > now()
  order by created_at desc
  limit 1;

  if v_existente is not null then
    return v_existente;
  end if;

  -- Busca email do perfil (aceita ativo ou pendente)
  select email into v_email
  from public.perfis
  where id = p_perfil_id and status in ('ativo', 'pendente');

  if v_email is null then
    raise exception 'Perfil nao encontrado ou inativo.';
  end if;

  v_codigo := lpad(floor(random() * 1000000)::text, 6, '0');

  insert into public.codigos_redefinicao (email, perfil_id, codigo, criado_por)
  values (v_email, p_perfil_id, v_codigo, p_criado_por);

  return v_codigo;
end;
$$;

comment on function public.fn_gerar_codigo_redefinicao is
  'Gera codigo de 6 digitos ou retorna codigo ativo existente. Aceita perfis ativo ou pendente. Apenas gestao.';

-- ============================================================================
-- 3. FUNCAO — REVOGAR CODIGO
-- ============================================================================

create or replace function public.fn_revogar_codigo(p_codigo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.get_user_papel() != 'gestao' then
    raise exception 'Apenas a gestao pode revogar codigos.';
  end if;

  update public.codigos_redefinicao
  set expira_em = now(),
      revogado_em = now()
  where id = p_codigo_id
    and usado_em is null
    and expira_em > now();

  if not found then
    raise exception 'Codigo ja foi usado ou ja expirou.';
  end if;
end;
$$;

comment on function public.fn_revogar_codigo is
  'Revogacao manual de codigo ativo. Define expira_em = now() e registra revogado_em. Lanca erro se ja usado ou expirado.';

-- ============================================================================
-- 4. GRANTS
-- ============================================================================

grant execute on function public.fn_gerar_codigo_redefinicao to authenticated;
grant execute on function public.fn_revogar_codigo to authenticated;
