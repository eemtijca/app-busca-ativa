-- ============================================================================
-- Migration: Tipo de ocorrência como array (multisseleção)
-- Altera tipo de enum único para text[], permitindo marcar
-- "grave" e "suspensão" simultaneamente.
-- ============================================================================

-- a view v_feed_aluno depende da coluna tipo, precisa ser recriada
drop view if exists public.v_feed_aluno;

alter table ocorrencias
  alter column tipo drop default,
  alter column tipo type text[] using array[tipo::text];

-- drop do enum já que não é mais usado
drop type if exists public.tipo_ocorrencia;

-- recria a view com o novo tipo
create or replace view public.v_feed_aluno
with (security_invoker = true)
as
select
  f.aluno_id,
  f.data_aula as data_evento,
  f.created_at,
  'frequencia' as tipo_evento,
  jsonb_build_object(
    'tipo_registro', f.tipo_registro,
    'periodo', f.periodo,
    'status', f.status,
    'disciplina', d.nome,
    'observacao', f.observacao
  ) as detalhes
from public.frequencias f
left join public.disciplinas d on d.id = f.disciplina_id
where f.deleted_at is null

union all

select
  rc.aluno_id,
  rc.data_hora::date,
  rc.data_hora,
  'comportamento',
  jsonb_build_object(
    'observacao', rc.observacao,
    'tags', (
      select jsonb_agg(jsonb_build_object('nome', tg.nome, 'categoria', tg.categoria))
      from public.registro_comportamento_tags rct
      join public.tags_comportamento tg on tg.id = rct.tag_id
      where rct.registro_id = rc.id
    )
  )
from public.registros_comportamento rc

union all

select
  o.aluno_id,
  o.data_ocorrencia::date,
  o.data_ocorrencia,
  'ocorrencia',
  jsonb_build_object(
    'titulo', o.titulo,
    'tipo', o.tipo,
    'status', o.status,
    'exige_presenca', o.exige_presenca_responsavel
  )
from public.ocorrencias o

order by data_evento desc, created_at desc;

comment on view public.v_feed_aluno is 'RF22: Timeline unificada do aluno. Consolida frequências, comportamentos e ocorrências.';
