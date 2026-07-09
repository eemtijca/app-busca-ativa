<script setup lang="ts">
/**
 * GestaoHomeView - Painel da Gestão Escolar.
 *
 * Exibe boas-vindas, grade de ferramentas de gestão e
 * tabela comparativa de indicadores.
 */

import { computed } from 'vue';
import { useAutenticacao } from '@/composables/useAutenticacao';
import HeroSecao from '@/componentes/HeroSecao.vue';
import GradeRecursos from '@/componentes/GradeRecursos.vue';
import GradePrecosTabela from '@/componentes/GradePrecosTabela.vue';
import type { Recurso } from '@/tipos/componentes';

const { usuario } = useAutenticacao();

const nomeGestor = computed(() => usuario.value?.nome || 'Gestor');

const acoesHero = [
  { rotulo: 'Relatório Geral', variante: 'primary' as const, destaque: true },
  { rotulo: 'Configurar Período', variante: 'outline-secondary' as const },
];

const recursosGestao: Recurso[] = [
  {
    icone: 'people-fill',
    titulo: 'Equipe Escolar',
    descricao: 'Gerencie perfis de professores, responsáveis e alunos.',
  },
  {
    icone: 'building-fill',
    titulo: 'Unidades',
    descricao: 'Administre as unidades escolares e suas turmas.',
  },
  {
    icone: 'file-bar-graph-fill',
    titulo: 'Indicadores',
    descricao: 'Acompanhe métricas de frequência e desempenho.',
  },
  {
    icone: 'bell-fill',
    titulo: 'Comunicados',
    descricao: 'Envie comunicados institucionais para toda a escola.',
  },
  {
    icone: 'calendar-range-fill',
    titulo: 'Calendário',
    descricao: 'Gerencie o calendário letivo e eventos escolares.',
  },
  {
    icone: 'shield-check-fill',
    titulo: 'Segurança',
    descricao: 'Configure permissões e políticas de acesso.',
  },
];

const colunasTabela = ['Indicador', 'Janeiro', 'Fevereiro', 'Março'];
const linhasTabela = [
  { rotulo: 'Frequência Média', valores: ['94%', '96%', '91%'] },
  { rotulo: 'Ocorrências', valores: ['12', '8', '5'] },
  { rotulo: 'Alunos Ativos', valores: ['342', '338', '351'] },
  { rotulo: 'Comunicados', valores: ['3', '7', '12'] },
];
</script>

<template>
  <HeroSecao
    variante="escuro"
    :titulo="'Painel da Gestão'"
    :descricao="
      'Bem-vindo(a), ' +
      nomeGestor +
      '. Gerencie a equipe escolar e acompanhe os indicadores da rede.'
    "
    :acoes="acoesHero"
  />

  <GradeRecursos
    variante="icon-grid"
    tituloSecao="Ferramentas de Gestão"
    :recursos="recursosGestao"
  />

  <div class="container px-4 py-5">
    <GradePrecosTabela :colunas="colunasTabela" :linhas="linhasTabela">
      Indicadores do Período
    </GradePrecosTabela>
  </div>
</template>
