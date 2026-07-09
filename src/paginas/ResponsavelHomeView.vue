<script setup lang="ts">
/**
 * ResponsavelHomeView - Painel do Responsável.
 *
 * Exibe boas-vindas, informações do aluno e grade de
 * recursos de acompanhamento escolar.
 */

import { computed } from 'vue';
import { useAutenticacao } from '@/composables/useAutenticacao';
import HeroSecao from '@/componentes/HeroSecao.vue';
import GradeRecursos from '@/componentes/GradeRecursos.vue';
import CartaoPostagem from '@/componentes/CartaoPostagem.vue';
import type { Recurso, Postagem } from '@/tipos/componentes';

const { usuario } = useAutenticacao();

const nomeResponsavel = computed(() => usuario.value?.nome || 'Responsável');

const acoesHero = [
  { rotulo: 'Frequência', variante: 'primary' as const, destaque: true },
  { rotulo: 'Solicitar Justificativa', variante: 'outline-secondary' as const },
];

const recursosResponsavel: Recurso[] = [
  {
    icone: 'calendar-check',
    titulo: 'Frequência',
    descricao: 'Acompanhe a presença do seu filho nas aulas.',
  },
  { icone: 'file-text', titulo: 'Boletim', descricao: 'Consulte notas e desempenho escolar.' },
  {
    icone: 'envelope',
    titulo: 'Comunicados',
    descricao: 'Leia os comunicados enviados pela escola.',
  },
  {
    icone: 'exclamation-circle',
    titulo: 'Ocorrências',
    descricao: 'Visualize ocorrências registradas.',
  },
  {
    icone: 'calendar-event',
    titulo: 'Calendário',
    descricao: 'Acompanhe o calendário letivo e eventos.',
  },
  {
    icone: 'person-badge',
    titulo: 'Dados do Aluno',
    descricao: 'Atualize informações cadastrais.',
  },
];

const ultimasPostagens: Postagem[] = [
  {
    titulo: 'Reunião de Pais e Mestres',
    resumo: 'A reunião bimestral está agendada para o dia 15. Sua presença é fundamental.',
    data: '10 Abr',
    autor: 'Gestão Escolar',
    categoria: 'Comunicado',
  },
  {
    titulo: 'Semana de Provas',
    resumo: 'As avaliações do 2º bimestre ocorrerão entre os dias 20 e 25. Confira o calendário.',
    data: '5 Abr',
    autor: 'Coordenação Pedagógica',
    categoria: 'Acadêmico',
  },
];
</script>

<template>
  <HeroSecao
    variante="centrado"
    :titulo="'Olá, ' + nomeResponsavel"
    descricao="Acompanhe a vida escolar do seu filho de forma simples e transparente."
    :acoes="acoesHero"
  />

  <GradeRecursos
    variante="icon-square"
    tituloSecao="Acompanhamento"
    :recursos="recursosResponsavel"
  />

  <div class="container px-4 py-5">
    <h2 class="pb-2 border-bottom mb-4">Últimos Comunicados</h2>
    <div class="row">
      <div v-for="(postagem, idx) in ultimasPostagens" :key="idx" class="col-md-6">
        <CartaoPostagem :postagem="postagem" variante="card" />
      </div>
    </div>
  </div>
</template>
