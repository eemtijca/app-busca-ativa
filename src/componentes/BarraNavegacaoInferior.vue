<script setup lang="ts">
/**
 * BarraNavegacaoInferior - Barra de navegação inferior fixa.
 *
 * Navbar fixada na parte inferior da janela (fixed-bottom) com fundo escuro,
 * suporte a collapse em telas pequenas e links de navegação.
 *
 * API:
 * - itens: (LinkNav & { desabilitado?: boolean })[] — links de navegação
 * - marca?: string — texto da marca
 * - urlMarca?: string — URL da marca
 * - toggleLabel?: string — aria-label do botão toggle
 */

import type { LinkNav } from '@/tipos/componentes';

withDefaults(
  defineProps<{
    itens: (LinkNav & { desabilitado?: boolean })[];
    marca?: string;
    urlMarca?: string;
    toggleLabel?: string;
  }>(),
  { marca: '', urlMarca: '', itens: () => [], toggleLabel: '' },
);
</script>

<template>
  <nav class="navbar fixed-bottom navbar-expand-sm navbar-dark bg-dark">
    <div class="container-fluid">
      <a v-if="marca" class="navbar-brand" :href="urlMarca || '#'">{{ marca }}</a>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarBottomCollapse"
        aria-controls="navbarBottomCollapse"
        aria-expanded="false"
        :aria-label="toggleLabel"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarBottomCollapse">
        <ul class="navbar-nav">
          <li
            v-for="item in itens"
            :key="item.rotulo"
            class="nav-item"
            :class="{ dropup: item.icone === 'dropup' }"
          >
            <a
              v-if="!item.desabilitado && item.url"
              :href="item.url"
              class="nav-link"
              :class="{ active: item.ativo }"
              :aria-current="item.ativo ? 'page' : undefined"
            >
              {{ item.rotulo }}
            </a>
            <span v-else class="nav-link disabled" aria-disabled="true">
              {{ item.rotulo }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
