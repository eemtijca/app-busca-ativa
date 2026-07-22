<script setup lang="ts">
import { computed } from 'vue';
import type { OpcaoCheckbox } from '@/tipos/componentes';

const props = withDefaults(
  defineProps<{
    opcoes: OpcaoCheckbox[];
    modelo: string[];
    colunas?: 1 | 2 | 3 | 4;
    desabilitado?: boolean;
    nome?: string;
  }>(),
  {
    colunas: 1,
    desabilitado: false,
    nome: '',
  },
);

const emit = defineEmits<{
  'update:modelo': [valor: string[]];
}>();

const classeColuna = computed(() => {
  const tamanho = Math.max(1, Math.floor(12 / props.colunas));
  return `col-12 col-md-${tamanho}`;
});

function alternar(valor: string) {
  const idx = props.modelo.indexOf(valor);
  if (idx === -1) {
    emit('update:modelo', [...props.modelo, valor]);
  } else {
    const novo = [...props.modelo];
    novo.splice(idx, 1);
    emit('update:modelo', novo);
  }
}
</script>

<template>
  <div class="row g-2">
    <div
      v-for="opcao in opcoes"
      :key="opcao.valor"
      :class="classeColuna"
    >
      <div class="form-check">
        <input
          :id="`${nome || 'cb'}-${opcao.valor}`"
          :checked="modelo.includes(opcao.valor)"
          type="checkbox"
          class="form-check-input"
          :disabled="desabilitado || opcao.desabilitado"
          :aria-disabled="desabilitado || opcao.desabilitado"
          @change="alternar(opcao.valor)"
        />
        <label
          :for="`${nome || 'cb'}-${opcao.valor}`"
          class="form-check-label small"
          :class="{ 'text-body-secondary': desabilitado || opcao.desabilitado }"
        >
          <i v-if="opcao.icone" :class="`bi bi-${opcao.icone} me-1`" aria-hidden="true"></i>
          {{ opcao.rotulo }}
        </label>
      </div>
    </div>
  </div>
</template>
