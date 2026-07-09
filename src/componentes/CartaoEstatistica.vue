<script setup lang="ts">
/**
 * CartaoEstatistica - Cartão de estatística para o Painel
 * Confidencial de Busca Ativa da gestão.
 *
 * Inspirado no padrão de "dashboard cards" do Bootstrap 5.3:
 *   https://getbootstrap.com/docs/5.3/examples/dashboard/
 *
 * É um componente DUMB: recebe tudo via props, não busca dados.
 *
 * API:
 *   - estatistica: EstatisticaPainel (rotulo, valor, icone, variante, rodape)
 */

import type { EstatisticaPainel } from '@/tipos/componentes';

const props = defineProps<{
  estatistica: EstatisticaPainel;
}>();

const classeVariante = `text-bg-${props.estatistica.variante}`;
</script>

<template>
  <div class="card shadow-sm h-100 border-0 overflow-hidden">
    <div class="card-body d-flex align-items-center gap-3">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
        :class="classeVariante"
        style="width: 56px; height: 56px"
        aria-hidden="true"
      >
        <i :class="'bi bi-' + estatistica.icone" style="font-size: 1.5rem"></i>
      </span>
      <div class="min-w-0 flex-grow-1">
        <div class="text-body-secondary text-uppercase small fw-semibold lh-1">
          {{ estatistica.rotulo }}
        </div>
        <div class="fs-3 fw-bold lh-1 mt-1">{{ estatistica.valor }}</div>
        <div v-if="estatistica.rodape" class="text-body-secondary small mt-1">
          {{ estatistica.rodape }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}
</style>
