-- ============================================================================
-- Migration: Campos extras para formulários da gestão
-- Adiciona colunas de módulos de acesso, permissões, documentos e
-- indicadores nos perfis e alunos.
-- ============================================================================

-- -------- perfis --------
alter table perfis
  add column if not exists acesso_modulos text[] not null default '{}',
  add column if not exists permissoes text[] not null default '{}';

-- -------- alunos --------
alter table alunos
  add column if not exists transporte_escolar boolean not null default false,
  add column if not exists alimentacao_diferenciada boolean not null default false,
  add column if not exists necessidades_especiais boolean not null default false,
  add column if not exists documentos_recebidos text[] not null default '{}';

-- ============================================================================
-- RLS: as novas colunas seguem as políticas já existentes nas tabelas
-- (SELECT/UPDATE/INSERT já são controladas pelas policies de perfis e alunos)
-- ============================================================================
