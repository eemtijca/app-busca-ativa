-- ============================================================
-- Migration: 0001_schema_inicial
-- Descrição: Criação do schema inicial do MVP Busca Ativa
-- Tabelas: perfis, alunos, vinculos_responsaveis, frequencias, ocorrencias
-- Inclui: RLS, triggers e função auxiliar de verificação de papel
-- ============================================================

-- ----------------------------
-- Função auxiliar: verifica se o usuário autenticado pertence a um papel
-- SECURITY DEFINER para evitar recursão infinita no RLS
-- ----------------------------
create or replace function public.pertence_grupo(papel_esperado text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = papel_esperado
  );
$$;

-- ----------------------------
-- 1. Tabela: perfis
-- Vinculada 1:1 ao auth.users
-- ----------------------------
create table public.perfis (
  id         uuid        primary key references auth.users(id) on delete cascade,
  nome       text        not null,
  papel      text        not null check (papel in ('professor', 'gestao', 'responsavel')),
  email      text,
  telefone   text,
  created_at timestamptz not null default now()
);

-- ----------------------------
-- Trigger: criar perfil automaticamente ao cadastrar em auth.users
-- ----------------------------
create or replace function public.criar_perfil_apos_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', 'Usuário'),
    coalesce(new.raw_user_meta_data ->> 'papel', 'professor')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.criar_perfil_apos_cadastro();

-- ----------------------------
-- 2. Tabela: alunos
-- ----------------------------
create table public.alunos (
  id         uuid        primary key default gen_random_uuid(),
  nome       text        not null,
  matricula  text        not null unique,
  turma      text,
  serie      text,
  created_at timestamptz not null default now()
);

-- ----------------------------
-- 3. Tabela: vinculos_responsaveis
-- ----------------------------
create table public.vinculos_responsaveis (
  id              uuid        primary key default gen_random_uuid(),
  responsavel_id  uuid        not null references public.perfis(id) on delete cascade,
  aluno_id        uuid        not null references public.alunos(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique(responsavel_id, aluno_id)
);

-- ----------------------------
-- 4. Tabela: frequencias
-- ----------------------------
create table public.frequencias (
  id            uuid        primary key default gen_random_uuid(),
  aluno_id      uuid        not null references public.alunos(id) on delete cascade,
  professor_id  uuid        not null references public.perfis(id),
  data_aula     date        not null,
  periodo       text        not null,
  status        text        not null default 'ausente' check (status in ('presente', 'ausente')),
  justificativa text,
  anexo_url     text,
  created_at    timestamptz not null default now()
);

-- ----------------------------
-- 5. Tabela: ocorrencias
-- ----------------------------
create table public.ocorrencias (
  id                         uuid        primary key default gen_random_uuid(),
  aluno_id                   uuid        not null references public.alunos(id) on delete cascade,
  professor_id               uuid        not null references public.perfis(id),
  descricao                  text        not null,
  tipo                       text        not null check (tipo in ('grave', 'suspensao')),
  status_justificativa       text        not null default 'pendente' check (status_justificativa in ('pendente', 'aceita', 'recusada')),
  anexo_url                  text,
  exige_presenca_responsavel boolean     not null default false,
  created_at                 timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Ativar RLS em todas as tabelas
alter table public.perfis enable row level security;
alter table public.alunos enable row level security;
alter table public.vinculos_responsaveis enable row level security;
alter table public.frequencias enable row level security;
alter table public.ocorrencias enable row level security;

-- ----------------------------
-- Políticas: perfis
-- ----------------------------
create policy "Leitura próprio perfil" on public.perfis
  for select using (auth.uid() = id);

create policy "Gestão leitura total perfis" on public.perfis
  for select using (public.pertence_grupo('gestao'));

create policy "Atualização próprio perfil" on public.perfis
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Gestão inserção perfis" on public.perfis
  for insert with check (public.pertence_grupo('gestao'));

create policy "Gestão atualização perfis" on public.perfis
  for update using (public.pertence_grupo('gestao'));

create policy "Gestão exclusão perfis" on public.perfis
  for delete using (public.pertence_grupo('gestao'));

-- ----------------------------
-- Políticas: alunos
-- ----------------------------
create policy "Gestão CRUD alunos" on public.alunos
  for all using (public.pertence_grupo('gestao'));

create policy "Professores e gestão leitura alunos" on public.alunos
  for select using (
    public.pertence_grupo('professor') or public.pertence_grupo('gestao')
  );

create policy "Responsáveis leitura alunos vinculados" on public.alunos
  for select using (
    exists (
      select 1 from public.vinculos_responsaveis
      where aluno_id = alunos.id and responsavel_id = auth.uid()
    )
  );

-- ----------------------------
-- Políticas: vinculos_responsaveis
-- ----------------------------
create policy "Gestão CRUD vinculos" on public.vinculos_responsaveis
  for all using (public.pertence_grupo('gestao'));

create policy "Responsável leitura próprios vinculos" on public.vinculos_responsaveis
  for select using (responsavel_id = auth.uid());

-- ----------------------------
-- Políticas: frequencias
-- ----------------------------
create policy "Gestão e professores leitura frequencias" on public.frequencias
  for select using (
    public.pertence_grupo('gestao') or public.pertence_grupo('professor')
  );

create policy "Responsável leitura frequencias vinculadas" on public.frequencias
  for select using (
    exists (
      select 1 from public.vinculos_responsaveis
      where aluno_id = frequencias.aluno_id and responsavel_id = auth.uid()
    )
  );

create policy "Professores inserem frequencias" on public.frequencias
  for insert with check (auth.uid() = professor_id);

create policy "Gestão inserção frequencias" on public.frequencias
  for insert with check (public.pertence_grupo('gestao'));

create policy "Gestão atualização frequencias" on public.frequencias
  for update using (public.pertence_grupo('gestao'));

-- ----------------------------
-- Políticas: ocorrencias
-- ----------------------------
create policy "Gestão e professores leitura ocorrencias" on public.ocorrencias
  for select using (
    public.pertence_grupo('gestao') or public.pertence_grupo('professor')
  );

create policy "Responsável leitura ocorrencias vinculadas" on public.ocorrencias
  for select using (
    exists (
      select 1 from public.vinculos_responsaveis
      where aluno_id = ocorrencias.aluno_id and responsavel_id = auth.uid()
    )
  );

create policy "Professores inserem ocorrencias" on public.ocorrencias
  for insert with check (auth.uid() = professor_id);

create policy "Gestão inserção ocorrencias" on public.ocorrencias
  for insert with check (public.pertence_grupo('gestao'));

create policy "Gestão atualização ocorrencias" on public.ocorrencias
  for update using (public.pertence_grupo('gestao'));
