-- ============================================================================
-- Migration: codigos_redefinicao
-- Descricao: Tabela de codigos para redefinicao de senha, funcoes auxiliares
--            e alteracao do enum tipo_notificacao.
-- ============================================================================

-- ============================================================================
-- 1. ALTERAR ENUM
-- ============================================================================
alter type public.tipo_notificacao add value 'codigo_redefinicao';

-- ============================================================================
-- 2. TABELA CODIGOS_REDEFINICAO
-- ============================================================================
create table public.codigos_redefinicao (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null,
  perfil_id  uuid        not null references public.perfis(id) on delete cascade,
  codigo     text        not null,
  criado_por uuid        references public.perfis(id) on delete set null,
  usado_em   timestamptz,
  expira_em  timestamptz not null default (now() + interval '1 hour'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.codigos_redefinicao is
  'Codigos de uso unico para redefinicao de senha via administracao. Expira em 1 hora.';

create index idx_codigos_redefinicao_email on public.codigos_redefinicao(email);
create index idx_codigos_redefinicao_email_codigo on public.codigos_redefinicao(email, codigo);

-- ============================================================================
-- 3. FUNCOES AUXILIARES
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
begin
  if public.get_user_papel() != 'gestao' then
    raise exception 'Apenas a gestao pode gerar codigos de redefinicao.';
  end if;

  select email into v_email
  from public.perfis
  where id = p_perfil_id and status = 'ativo';

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
  'Gera um codigo de 6 digitos para redefinicao de senha. Apenas gestao.';

create or replace function public.fn_solicitar_codigo_redefinicao(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil_id uuid;
  v_papel     text;
  v_nome      text;
begin
  select id, papel::text, nome into v_perfil_id, v_papel, v_nome
  from public.perfis
  where email = p_email and status = 'ativo';

  if v_perfil_id is not null then
    insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, metadados)
    select
      p.id,
      'codigo_redefinicao',
      'Solicitacao de redefinicao de senha',
      'O usuario ' || v_nome || ' (' || p_email || ', ' || v_papel || ') solicitou um codigo para redefinir a senha.',
      jsonb_build_object('email', p_email, 'perfil_id', v_perfil_id)
    from public.perfis p
    where p.papel = 'gestao' and p.status = 'ativo';
  end if;
end;
$$;

comment on function public.fn_solicitar_codigo_redefinicao is
  'Cria notificacoes para todos os usuarios de gestao quando alguem solicita redefinicao de senha.';

-- ============================================================================
-- 3B. FUNCAO CRIAR USUARIO
-- ============================================================================

create or replace function public.fn_criar_usuario(
  p_nome      text,
  p_email     text,
  p_papel     text,
  p_senha     text,
  p_telefone  text default null,
  p_cargo     text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if public.get_user_papel() != 'gestao' then
    raise exception 'Apenas gestao pode criar usuarios.';
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, confirmation_sent_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, email_change_token_current, reauthentication_token, is_sso_user, is_anonymous, created_at, updated_at)
  values (
    v_user_id,
    p_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf', 10)),
    jsonb_build_object('email_verified', true, 'nome', p_nome, 'papel', p_papel),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false,
    now(),
    now()
  );

  update public.perfis
  set telefone = p_telefone,
      cargo = p_cargo,
      status = 'pendente'
  where id = v_user_id;

  return v_user_id;
end;
$$;

comment on function public.fn_criar_usuario is
  'Cria usuario em auth.users com perfil pendente. Apenas gestao. O trigger fn_handle_new_user cria o perfil automaticamente.';

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

alter table public.codigos_redefinicao enable row level security;

create policy "Codigos: gestao tem acesso total"
  on public.codigos_redefinicao for all
  to authenticated
  using (public.get_user_papel() = 'gestao')
  with check (public.get_user_papel() = 'gestao');

create policy "Codigos: usuario ve seus proprios registros"
  on public.codigos_redefinicao for select
  to authenticated
  using (
    exists (
      select 1 from public.perfis
      where id = auth.uid()
        and email = codigos_redefinicao.email
    )
  );

-- ============================================================================
-- 5. TRIGGER UPDATED_AT
-- ============================================================================
create trigger trg_set_updated_at
  before update on public.codigos_redefinicao
  for each row
  execute function public.fn_set_updated_at();

-- ============================================================================
-- 6. GRANTS — EXPOR TABELAS E FUNCOES VIA DATA API
-- ============================================================================

grant select, insert, update on public.codigos_redefinicao to authenticated, service_role;

-- Permissao DELETE para frequencias (usada pelo fluxo de DELETE+INSERT)
grant delete on public.frequencias to authenticated;

-- Permissao UPDATE para notificacoes (marcar como lida)
grant update on public.notificacoes to authenticated;

-- Permissao INSERT para justificativas (gestao inserir manualmente)
grant insert on public.justificativas_faltas to authenticated;

grant execute on function public.fn_gerar_codigo_redefinicao to authenticated;
grant execute on function public.fn_criar_usuario to authenticated;
grant execute on function public.fn_solicitar_codigo_redefinicao to anon;

-- ============================================================================
-- 7. POLICIES ADICIONAIS
-- ============================================================================

create policy "Freq: professor deleta proprias"
  on public.frequencias for delete
  to authenticated
  using (professor_id = auth.uid() and public.get_user_papel() = 'professor');

create policy "Freq: gestao deleta"
  on public.frequencias for delete
  to authenticated
  using (public.get_user_papel() = 'gestao');

create policy "JustFaltas: gestao insere"
  on public.justificativas_faltas for insert
  to authenticated
  with check (public.get_user_papel() = 'gestao');

create policy "Notif: destinatario atualiza lida"
  on public.notificacoes for update
  to authenticated
  using (destinatario_id = auth.uid())
  with check (destinatario_id = auth.uid() and (lida = true or lida_em is not null));
