<script setup lang="ts">
import { useAutenticacao } from '@/composables/useAutenticacao';
import CartaoNavegacao from '@/componentes/CartaoNavegacao.vue';

const { usuario } = useAutenticacao();
const nomeGestor = usuario.value?.nome || 'Gestor';
</script>

<template>
  <div class="container py-4 py-md-5" style="max-width: 800px">
    <div class="text-center mb-4 mb-md-5">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary mb-3"
        style="width: 64px; height: 64px; font-size: 1.75rem"
      >
        <i class="bi bi-shield-lock" aria-hidden="true"></i>
      </span>
      <h1 class="h4 fw-bold mb-1">Painel confidencial</h1>
      <p class="text-body-secondary small mb-0">
        Bem-vindo(a), {{ nomeGestor }}. Monitore e priorize ações de busca ativa.
      </p>
    </div>

    <div class="row g-3 justify-content-center">
      <div class="col-12 col-md-6 col-lg-4">
        <CartaoNavegacao
          icone="bar-chart"
          titulo="Ranking de risco"
          descricao="Visualize alunos ordenados do caso mais crítico ao mais leve."
          rota="/gestao/ranking"
          cor="danger"
        />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <CartaoNavegacao
          icone="shield-exclamation"
          titulo="Ocorrências graves"
          descricao="Centralize suspensões, bloqueios de retorno e documentos."
          rota="/gestao/ocorrencias"
          cor="dark"
        />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <CartaoNavegacao
          icone="clipboard-check"
          titulo="Justificativas"
          descricao="Valide ou recuse justificativas enviadas pelos responsáveis."
          rota="/gestao/justificativas"
          cor="info"
        />
      </div>
    </div>
  </div>
</template>
