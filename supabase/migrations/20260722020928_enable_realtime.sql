-- ============================================================================
-- Migration: enable_realtime
-- Descricao: Adiciona tabelas necessarias a publication supabase_realtime
--            para que os eventos postgres_changes funcionem.
-- ============================================================================

alter publication supabase_realtime add table public.notificacoes;
alter publication supabase_realtime add table public.codigos_redefinicao;
alter publication supabase_realtime add table public.alunos;
alter publication supabase_realtime add table public.perfis;
alter publication supabase_realtime add table public.ocorrencias;
alter publication supabase_realtime add table public.justificativas_faltas;
alter publication supabase_realtime add table public.frequencias;
