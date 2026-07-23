<script setup lang="ts">
withDefaults(
  defineProps<{
    selecionado: boolean;
    desabilitado?: boolean;
    variante?: 'success' | 'primary' | 'warning' | 'danger' | 'info';
  }>(),
  {
    desabilitado: false,
    variante: 'success',
  },
);

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    type="button"
    class="btn btn-sm w-100 text-start d-flex align-items-center gap-2 border"
    :class="[selecionado ? `btn-${variante} border-${variante}` : 'btn-outline-secondary bg-body']"
    :disabled="desabilitado"
    :aria-pressed="selecionado"
    @click="emit('click')"
  >
    <i
      :class="[
        selecionado ? 'bi bi-check-circle-fill' : 'bi bi-circle',
        'flex-shrink-0',
        selecionado ? '' : 'text-body-tertiary',
      ]"
      aria-hidden="true"
    ></i>
    <span class="small flex-grow-1"><slot /></span>
  </button>
</template>
