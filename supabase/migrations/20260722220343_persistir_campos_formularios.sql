-- ============================================================================
-- Migration: Persistir campos dos formulários do professor
-- Adiciona colunas para tags, notificações e motivos que antes ficavam
-- apenas na UI sem persistência no banco.
-- ============================================================================

-- -------- ocorrencias --------
alter table ocorrencias
  add column if not exists tags_comportamento text[] not null default '{}',
  add column if not exists notificar_coordenacao boolean not null default true,
  add column if not exists notificar_responsavel boolean not null default false;

-- -------- frequencias --------
-- observacao já existe; adicionar coluna para os motivos rápidos
alter table frequencias
  add column if not exists motivos_ausencia text[] not null default '{}';

-- ============================================================================
-- RLS: as novas colunas seguem as políticas já existentes nas tabelas
-- ============================================================================
