-- ============================================================
-- Migration: concessao_permissoes_api
-- Descrição: Concede permissões de acesso às tabelas públicas
--            para o papel 'authenticated' da Data API.
--
-- MOTIVAÇÃO:
--   O Supabase local (CLI v2.109+) não expõe automaticamente
--   tabelas recém-criadas à Data API. Sem estes GRANTs, qualquer
--   consulta do frontend via cliente JS retorna erro 403
--   (permission denied), mesmo com RLS configurado.
--
--   O papel 'anon' (não autenticado) propositalmente NÃO recebe
--   permissão aqui porque:
--     1. O RLS em perfis usa auth.uid() = id — anon tem uid = NULL
--     2. O guarda de rota (router.beforeEach) só consulta perfis
--        quando já existe sessão (usuário autenticado)
--     3. Demais tabelas exigem autenticação por regra de negócio
--
--   Referência: https://supabase.com/docs/guides/api/securing-your-api
-- ============================================================

-- Permissões de leitura (SELECT) para o papel autenticado
-- O RLS filtra as linhas que cada usuário pode de fato enxergar
GRANT SELECT ON public.perfis TO authenticated;
GRANT SELECT ON public.alunos TO authenticated;
GRANT SELECT ON public.vinculos_responsaveis TO authenticated;
GRANT SELECT ON public.frequencias TO authenticated;
GRANT SELECT ON public.ocorrencias TO authenticated;

-- Permissões de escrita para professores registrarem dados
GRANT INSERT, UPDATE ON public.frequencias TO authenticated;
GRANT INSERT, UPDATE ON public.ocorrencias TO authenticated;
