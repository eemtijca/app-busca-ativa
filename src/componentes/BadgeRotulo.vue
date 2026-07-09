<script setup lang="ts">
/**
 * BadgeRotulo - Componente de selo/etiqueta do Bootstrap.
 *
 * Renderiza um <span> com as classes .badge .rounded-pill, suportando as
 * variantes: sólida (text-bg-*), sutil (bg-*-subtle), borda (com border),
 * avatar (com imagem), removível (com botão X) e avatar-removível.
 *
 * API:
 * - cor: CorBadge — cor temática (primary, secondary, success, etc.)
 * - variante: VarianteBadge — estilo visual
 * - removivel: boolean — exibe botão de remoção
 * - avatarSrc: string — URL da imagem do avatar
 * - slot default: conteúdo textual
 * - @remover: emitido ao clicar no botão de remoção
 */

import { computed } from 'vue';
import type { CorBadge, VarianteBadge } from '@/tipos/componentes';

const props = withDefaults(
  defineProps<{
    cor: CorBadge;
    variante?: VarianteBadge;
    removivel?: boolean;
    avatarSrc?: string;
  }>(),
  { variante: 'solida', removivel: false },
);

const emit = defineEmits<{
  remover: [];
}>();

const classesBadge = computed(() => {
  const base = 'badge rounded-pill';
  switch (props.variante) {
    case 'solida':
      return `${base} text-bg-${props.cor}`;
    case 'sutil':
      return `${base} bg-${props.cor}-subtle text-${props.cor}-emphasis`;
    case 'borda':
      return `${base} bg-${props.cor}-subtle border border-${props.cor}-subtle text-${props.cor}-emphasis`;
    case 'avatar':
    case 'avatar-removivel':
      return `${base} d-flex align-items-center p-1 pe-2 text-${props.cor}-emphasis bg-${props.cor}-subtle border border-${props.cor}-subtle rounded-pill`;
    default:
      return `${base} text-bg-${props.cor}`;
  }
});

const mostraAvatar = computed(
  () => props.variante === 'avatar' || props.variante === 'avatar-removivel',
);
const mostraSeparador = computed(() => props.variante === 'avatar-removivel');
</script>

<template>
  <span :class="classesBadge">
    <img
      v-if="mostraAvatar && avatarSrc"
      class="rounded-circle me-1"
      width="24"
      height="24"
      :src="avatarSrc"
      alt=""
    />
    <span class="px-1"><slot /></span>
    <span v-if="mostraSeparador" class="vr mx-2"></span>
    <button
      v-if="removivel || variante === 'removivel' || variante === 'avatar-removivel'"
      type="button"
      class="badge-remover"
      aria-label="Remover"
      @click="emit('remover')"
    >
      <i class="bi bi-x-circle" width="16" height="16" aria-hidden="true"></i>
    </button>
  </span>
</template>

<style scoped>
.badge-remover {
  color: inherit;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
</style>
