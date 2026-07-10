-- ============================================================
-- Seed: Dados padrão para desenvolvimento
-- ============================================================

-- ----------------------------
-- Configurações da Escola
-- ----------------------------
insert into public.configuracoes_escola (chave, valor, descricao) values
  ('chat_hora_inicio',     '07:00',  'Horário de início do chat (RF27)'),
  ('chat_hora_fim',        '17:00',  'Horário de encerramento do chat (RF27)'),
  ('chat_permitir_sabado', 'false',  'Permitir chat aos sábados'),
  ('chat_permitir_domingo','false',  'Permitir chat aos domingos'),
  ('nome_escola',          'EEMTI',  'Nome da unidade escolar')
on conflict (chave) do nothing;

-- ----------------------------
-- Ano Letivo Vigente
-- ----------------------------
insert into public.anos_letivos (ano, status, data_inicio, data_fim, ativo)
values (
  extract(year from current_date)::int,
  'ativo',
  make_date(extract(year from current_date)::int, 2, 1),
  make_date(extract(year from current_date)::int, 12, 20),
  true
)
on conflict (ano) do nothing;

-- ----------------------------
-- Horários Letivos (dias úteis, 07:00–17:00)
-- ----------------------------
insert into public.horarios_letivos (dia_semana, hora_inicio, hora_fim) values
  (1, '07:00', '17:00'), -- Segunda
  (2, '07:00', '17:00'), -- Terça
  (3, '07:00', '17:00'), -- Quarta
  (4, '07:00', '17:00'), -- Quinta
  (5, '07:00', '17:00')  -- Sexta
on conflict (dia_semana, hora_inicio, hora_fim) do nothing;

-- ----------------------------
-- Tags de Comportamento (RF16)
-- ----------------------------
insert into public.tags_comportamento (nome, categoria, icone, descricao, peso_pontuacao) values
  ('Participativo',  'positivo', 'bi-hand-thumbs-up',  'Aluno participou ativamente da aula', 10),
  ('Colaborativo',   'positivo', 'bi-people',          'Trabalhou bem em grupo',             10),
  ('Pontual',        'positivo', 'bi-clock',           'Chegou no horário',                  5),
  ('Protagonista',   'positivo', 'bi-star',            'Demonstrou iniciativa e liderança',   15),
  ('Desatenção',     'atencao',  'bi-eye-slash',       'Dificuldade de concentração pontual', 0),
  ('Uso de celular', 'atencao',  'bi-phone',           'Uso não autorizado de celular',      0),
  ('Conversa paralela', 'atencao', 'bi-chat-dots',     'Conversa fora do contexto da aula',   0),
  ('Sem material',   'atencao',  'bi-book',             'Não trouxe material necessário',     0)
on conflict (nome) do nothing;
