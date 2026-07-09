<script setup lang="ts">
/**
 * ProfessorHomeView - Painel do Professor.
 *
 * Exibe boas-vindas, grade de ações rápidas e badges de turmas.
 * Segue o padrão visual dos exemplos do Bootstrap.
 */

import { computed } from 'vue';
import { useAutenticacao } from '@/composables/useAutenticacao';
import HeroSecao from '@/componentes/HeroSecao.vue';
import GradeRecursos from '@/componentes/GradeRecursos.vue';
import BadgeRotulo from '@/componentes/BadgeRotulo.vue';
import type { Recurso } from '@/tipos/componentes';

const { usuario } = useAutenticacao();

const nomeProfessor = computed(() => usuario.value?.nome || 'Professor');

const acoesHero = [
  { rotulo: 'Registrar Frequência', variante: 'primary' as const, destaque: true },
  { rotulo: 'Lançar Ocorrência', variante: 'outline-secondary' as const },
];

const recursosProfessor: Recurso[] = [
  {
    icone: 'people-fill',
    titulo: 'Minhas Turmas',
    descricao: 'Visualize e gerencie suas turmas e alunos cadastrados.',
  },
  {
    icone: 'calendar-check-fill',
    titulo: 'Frequência',
    descricao: 'Registre a presença dos alunos de forma rápida.',
  },
  {
    icone: 'exclamation-triangle-fill',
    titulo: 'Ocorrências',
    descricao: 'Registre e acompanhe ocorrências disciplinares.',
  },
  {
    icone: 'chat-dots-fill',
    titulo: 'Comunicados',
    descricao: 'Envie comunicados aos responsáveis dos alunos.',
  },
  {
    icone: 'bar-chart-fill',
    titulo: 'Relatórios',
    descricao: 'Acompanhe o desempenho e a frequência da turma.',
  },
  {
    icone: 'gear-fill',
    titulo: 'Configurações',
    descricao: 'Ajuste suas preferências e dados do perfil.',
  },
];
</script>

<template>
  <HeroSecao
    variante="centrado"
    :titulo="'Bem-vindo(a), ' + nomeProfessor"
    descricao="Acompanhe seus alunos, registre frequências e ocorrências em poucos cliques."
    :acoes="acoesHero"
  />

  <div class="d-flex gap-2 justify-content-center mb-4">
    <BadgeRotulo cor="primary" variante="solida">Ensino Fundamental</BadgeRotulo>
    <BadgeRotulo cor="success" variante="sutil">3 turmas ativas</BadgeRotulo>
    <BadgeRotulo cor="warning" variante="borda">32 alunos</BadgeRotulo>
  </div>

  <GradeRecursos
    variante="feature-icon"
    tituloSecao="Ações Rápidas"
    :recursos="recursosProfessor"
  />
</template>
