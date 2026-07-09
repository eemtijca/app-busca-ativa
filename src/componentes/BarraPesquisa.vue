<script setup lang="ts">
/**
 * BarraPesquisa - Campo de pesquisa encapsulado.
 *
 * Input de busca com suporte a v-model e emissão de evento ao submeter.
 * Duas variantes visuais: clara (padrão) e escura (para fundos escuros).
 *
 * API:
 * - modelValue?: string — valor atual (v-model)
 * - placeholder?: string — texto do placeholder
 * - ariaLabel?: string — aria-label do input
 * - variante?: 'clara' | 'escura'
 * - @update:modelValue — emitido ao digitar
 * - @buscar — emitido ao submeter o formulário
 */

withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    ariaLabel?: string;
    variante?: 'clara' | 'escura';
  }>(),
  { modelValue: '', placeholder: '', ariaLabel: '', variante: 'clara' },
);

const emit = defineEmits<{
  'update:modelValue': [valor: string];
  buscar: [valor: string];
}>();

function aoDigitar(event: Event) {
  const valor = (event.target as HTMLInputElement).value;
  emit('update:modelValue', valor);
}

function aoSubmeter(event: Event) {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const input = form.querySelector('input') as HTMLInputElement;
  emit('buscar', input.value);
}
</script>

<template>
  <form role="search" @submit="aoSubmeter">
    <input
      type="search"
      :class="['form-control', variante === 'escura' ? 'form-control-dark text-bg-dark' : '']"
      :placeholder="placeholder"
      :value="modelValue"
      :aria-label="ariaLabel || placeholder"
      @input="aoDigitar"
    />
  </form>
</template>

<style scoped>
.form-control-dark {
  border-color: var(--bs-gray);
}
.form-control-dark:focus {
  border-color: #fff;
  box-shadow: 0 0 0 0.25rem rgba(255, 255, 255, 0.25);
}
</style>
