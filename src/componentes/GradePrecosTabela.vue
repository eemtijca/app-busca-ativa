<script setup lang="ts">
/**
 * GradePrecosTabela - Tabela comparativa de planos.
 *
 * Renderiza uma tabela responsiva comparando recursos entre planos.
 * O slot default é usado para o título "Comparar planos".
 *
 * API:
 * - colunas: string[] — nomes das colunas (planos)
 * - linhas: { rotulo: string; valores: (boolean | string)[] }[]
 * - ariaLabelCheck?: string — aria-label para ícone de check incluso
 * - slot default: título da tabela
 */

withDefaults(
  defineProps<{
    colunas: string[];
    linhas: { rotulo: string; valores: (boolean | string)[] }[];
    ariaLabelCheck?: string;
  }>(),
  { colunas: () => [], linhas: () => [], ariaLabelCheck: '' },
);
</script>

<template>
  <h2 v-if="$slots.default" class="display-6 text-center mb-4">
    <slot />
  </h2>
  <div class="table-responsive">
    <table class="table text-center">
      <thead>
        <tr>
          <th style="width: 34%"></th>
          <th v-for="coluna in colunas" :key="coluna" style="width: 22%">{{ coluna }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="linha in linhas" :key="linha.rotulo">
          <th scope="row" class="text-start">{{ linha.rotulo }}</th>
          <td v-for="(valor, idx) in linha.valores" :key="idx">
            <i
              v-if="valor === true"
              class="bi bi-check"
              style="font-size: 1.5rem"
              role="img"
              :aria-label="ariaLabelCheck || 'Incluso'"
            ></i>
            <template v-else-if="typeof valor === 'string'">{{ valor }}</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
