<script setup lang="ts">
/**
 * BreadcrumbNavegacao - Componente de navegação estrutural (breadcrumb).
 *
 * Três variantes: padrão (com bg-body-tertiary), chevron (seta personalizada
 * via CSS) e custom (estilo "stepper" com cantos angulados).
 *
 * API:
 * - itens: ItemBreadcrumb[] — { rotulo, url?, icone?, ativo? }
 * - variante?: 'padrao' | 'chevron' | 'custom'
 * - ariaLabel?: string — aria-label da navegação
 */

import { computed } from 'vue';
import type { ItemBreadcrumb } from '@/tipos/componentes';

const props = withDefaults(
  defineProps<{
    itens: ItemBreadcrumb[];
    variante?: 'padrao' | 'chevron' | 'custom';
    ariaLabel?: string;
  }>(),
  { variante: 'padrao', ariaLabel: '' },
);

const classesOl = computed(() => {
  const base = 'breadcrumb p-3 bg-body-tertiary rounded-3';
  if (props.variante === 'chevron') {
    return 'breadcrumb breadcrumb-chevron p-3 bg-body-tertiary rounded-3';
  }
  if (props.variante === 'custom') {
    return 'breadcrumb breadcrumb-custom overflow-hidden text-center bg-body-tertiary border rounded-3';
  }
  return base;
});
</script>

<template>
  <nav :aria-label="ariaLabel || 'Breadcrumb'">
    <ol :class="classesOl">
      <li
        v-for="(item, index) in itens"
        :key="index"
        class="breadcrumb-item"
        :class="{ active: item.ativo }"
        :aria-current="item.ativo ? 'page' : undefined"
      >
        <a
          v-if="item.url && !item.ativo"
          :href="item.url"
          :class="
            variante === 'padrao' ? '' : 'link-body-emphasis fw-semibold text-decoration-none'
          "
        >
          <i
            v-if="item.icone"
            :class="'bi bi-' + item.icone"
            width="16"
            height="16"
            aria-hidden="true"
          ></i>
          <span v-if="item.icone && !item.rotulo" class="visually-hidden">{{ item.rotulo }}</span>
          <template v-else>{{ item.rotulo }}</template>
        </a>
        <template v-else>
          <i
            v-if="item.icone"
            :class="'bi bi-' + item.icone"
            width="16"
            height="16"
            aria-hidden="true"
          ></i>
          {{ item.rotulo }}
        </template>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb-chevron {
  --bs-breadcrumb-divider: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%236c757d'%3E%3Cpath fill-rule='evenodd' d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
  gap: 0.5rem;
}
.breadcrumb-chevron .breadcrumb-item {
  display: flex;
  gap: inherit;
  align-items: center;
  padding-left: 0;
  line-height: 1;
}
.breadcrumb-chevron .breadcrumb-item::before {
  gap: inherit;
  float: none;
  width: 1rem;
  height: 1rem;
}

.breadcrumb-custom .breadcrumb-item {
  position: relative;
  flex-grow: 1;
  padding: 0.75rem 3rem;
}
.breadcrumb-custom .breadcrumb-item::before {
  display: none;
}
.breadcrumb-custom .breadcrumb-item::after {
  position: absolute;
  top: 50%;
  right: -25px;
  z-index: 1;
  display: inline-block;
  width: 50px;
  height: 50px;
  margin-top: -25px;
  content: '';
  background-color: var(--bs-tertiary-bg);
  border-top-right-radius: 0.5rem;
  box-shadow: 1px -1px var(--bs-border-color);
  transform: scale(0.707) rotate(45deg);
}
.breadcrumb-custom .breadcrumb-item:first-child {
  padding-left: 1.5rem;
}
.breadcrumb-custom .breadcrumb-item:last-child {
  padding-right: 1.5rem;
}
.breadcrumb-custom .breadcrumb-item:last-child::after {
  display: none;
}
</style>
