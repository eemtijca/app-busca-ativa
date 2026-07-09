<script setup lang="ts">
import type { EstatisticaPainel } from '@/tipos/componentes';

defineProps<{
  estatistica: EstatisticaPainel;
}>();
</script>

<template>
  <div class="card h-100 border">
    <div class="card-body d-flex align-items-center gap-3">
      <i
        :class="'bi bi-' + estatistica.icone + ' text-body-tertiary'"
        style="font-size: 1.5rem"
        aria-hidden="true"
      ></i>
      <div class="min-w-0 flex-grow-1">
        <div class="text-body-secondary small fw-semibold lh-1">
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
