<script setup lang="ts">
/**
 * SecaoProduto - Seção alternada de destaque do produto.
 *
 * Renderiza blocos lado a lado (flex-md-equal) com título, descrição,
 * links de ação e um placeholder visual arredondado. Três variantes
 * de fundo: escuro (text-bg-dark), claro (bg-body-tertiary), primario
 * (text-bg-primary).
 *
 * API:
 * - titulo: string
 * - descricao: string
 * - variante?: 'escuro' | 'claro' | 'primario'
 * - acoes?: AcaoHero[] — links de ação
 * - slot default: conteúdo adicional ao lado
 */

import type { AcaoHero } from '@/tipos/componentes';

withDefaults(
  defineProps<{
    titulo: string;
    descricao: string;
    variante?: 'escuro' | 'claro' | 'primario';
    acoes?: AcaoHero[];
  }>(),
  { variante: 'claro', acoes: () => [] },
);

const classeFundo: Record<string, string> = {
  escuro: 'text-bg-dark',
  claro: 'bg-body-tertiary',
  primario: 'text-bg-primary',
};
</script>

<template>
  <div class="d-md-flex flex-md-equal w-100 my-md-3 ps-md-3">
    <div
      class="me-md-3 pt-3 px-3 pt-md-5 px-md-5 text-center overflow-hidden"
      :class="classeFundo[variante] || classeFundo.claro"
    >
      <div class="my-3 py-3">
        <h2 class="display-5">{{ titulo }}</h2>
        <p class="lead">{{ descricao }}</p>
        <div v-if="acoes.length" class="d-flex gap-3 justify-content-center lead fw-normal mt-3">
          <a
            v-for="(acao, idx) in acoes"
            :key="idx"
            :href="acao.url || undefined"
            class="icon-link"
          >
            {{ acao.rotulo }}
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </a>
        </div>
      </div>
      <div
        class="bg-body shadow-sm mx-auto"
        style="width: 80%; height: 300px; border-radius: 21px 21px 0 0"
      ></div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
@media (min-width: 768px) {
  .flex-md-equal > * {
    flex: 1;
  }
}
</style>
