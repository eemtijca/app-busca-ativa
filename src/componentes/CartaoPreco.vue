<script setup lang="ts">
/**
 * CartaoPreco - Cartão de plano de preços.
 *
 * Exibe um plano com nome, preço, periodicidade, lista de recursos e botão
 * de ação. Quando destacado, aplica borda primary e cabeçalho com fundo
 * primary.
 *
 * API:
 * - plano: Plano — { nome, preco, periodicidade, recursos[], destacado?, rotuloBotao }
 * - @selecionar — emitido ao clicar no botão
 */

import type { Plano } from '@/tipos/componentes';

const props = defineProps<{
  plano: Plano;
}>();

defineEmits<{
  selecionar: [];
}>();

const cartaoClasse = `card mb-4 rounded-3 shadow-sm${props.plano.destacado ? ' border-primary' : ''}`;
const cabecalhoClasse = `card-header py-3${props.plano.destacado ? ' text-bg-primary border-primary' : ''}`;
const botaoClasse = `w-100 btn btn-lg${props.plano.destacado ? ' btn-primary' : ' btn-outline-primary'}`;
</script>

<template>
  <div class="col">
    <div :class="cartaoClasse">
      <div :class="cabecalhoClasse">
        <h4 class="my-0 fw-normal">{{ plano.nome }}</h4>
      </div>
      <div class="card-body">
        <h1 class="card-title pricing-card-title">
          {{ plano.preco
          }}<small class="text-body-secondary fw-light">/{{ plano.periodicidade }}</small>
        </h1>
        <ul class="list-unstyled mt-3 mb-4">
          <li v-for="(recurso, idx) in plano.recursos" :key="idx">{{ recurso }}</li>
        </ul>
        <button type="button" :class="botaoClasse" @click="$emit('selecionar')">
          {{ plano.rotuloBotao }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pricing-card-title {
  font-size: 2.25rem;
}
</style>
