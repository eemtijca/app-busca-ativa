<script setup lang="ts">
/**
 * GradeRecursos - Grade de recursos/seções de destaque.
 *
 * Seis variantes de layout: feature-icon (ícone grande centralizado),
 * icon-square (ícone quadrado à esquerda), card-cover (cartão com imagem
 * de fundo), icon-grid (grade 4 colunas), titulo-esquerda (título à
 * esquerda com grid 2x2 à direita).
 *
 * API:
 * - tituloSecao?: string — título opcional da seção
 * - recursos: Recurso[] — dados dos recursos
 * - variante: tipo de layout
 * - avatarAlt?: string — alt da imagem de avatar (card-cover)
 * - avatarUrl?: string — URL da imagem de avatar (card-cover)
 */

import type { Recurso } from '@/tipos/componentes';

const props = withDefaults(
  defineProps<{
    tituloSecao?: string;
    recursos: Recurso[];
    variante:
      | 'feature-icon'
      | 'icon-square'
      | 'card-cover'
      | 'icon-grid'
      | 'titulo-esquerda'
      | 'icon-small';
    avatarAlt?: string;
    avatarUrl?: string;
  }>(),
  { tituloSecao: '', avatarAlt: '', avatarUrl: '' },
);

function colunasClasse(): string {
  switch (props.variante) {
    case 'feature-icon':
      return 'row g-4 py-5 row-cols-1 row-cols-lg-3';
    case 'icon-square':
      return 'row g-4 py-5 row-cols-1 row-cols-lg-3';
    case 'card-cover':
      return 'row row-cols-1 row-cols-lg-3 align-items-stretch g-4 py-5';
    case 'icon-grid':
      return 'row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 py-5';
    case 'icon-small':
      return 'row row-cols-1 row-cols-sm-2 g-4';
    default:
      return 'row g-4 py-5 row-cols-1 row-cols-lg-3';
  }
}
</script>

<template>
  <div class="container px-4 py-5">
    <h2 v-if="tituloSecao" class="pb-2 border-bottom">{{ tituloSecao }}</h2>

    <!-- feature-icon: ícone grande centralizado sobre título -->
    <div v-if="variante === 'feature-icon'" :class="colunasClasse()">
      <div v-for="(recurso, idx) in recursos" :key="idx" class="feature col">
        <div
          class="feature-icon d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-2 mb-3"
        >
          <i :class="'bi bi-' + recurso.icone" width="1em" height="1em" aria-hidden="true"></i>
        </div>
        <h3 class="fs-2 text-body-emphasis">{{ recurso.titulo }}</h3>
        <p>{{ recurso.descricao }}</p>
        <a v-if="recurso.url" :href="recurso.url" class="icon-link">
          {{ recurso.rotuloAcao }}
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </a>
      </div>
    </div>

    <!-- icon-square: ícone quadrado à esquerda -->
    <div v-else-if="variante === 'icon-square'" :class="colunasClasse()">
      <div v-for="(recurso, idx) in recursos" :key="idx" class="col d-flex align-items-start">
        <div
          class="icon-square text-body-emphasis bg-body-secondary d-inline-flex align-items-center justify-content-center fs-4 flex-shrink-0 me-3"
        >
          <i :class="'bi bi-' + recurso.icone" width="1em" height="1em" aria-hidden="true"></i>
        </div>
        <div>
          <h3 class="fs-2 text-body-emphasis">{{ recurso.titulo }}</h3>
          <p>{{ recurso.descricao }}</p>
          <a v-if="recurso.url" :href="recurso.url" class="btn btn-primary">{{
            recurso.rotuloAcao
          }}</a>
        </div>
      </div>
    </div>

    <!-- card-cover: cartão com imagem de fundo -->
    <div v-else-if="variante === 'card-cover'" :class="colunasClasse()">
      <div v-for="(recurso, idx) in recursos" :key="idx" class="col">
        <div
          class="card card-cover h-100 overflow-hidden text-bg-dark rounded-4 shadow-lg"
          :style="{
            backgroundImage: recurso.avatarSrc ? 'url(' + recurso.avatarSrc + ')' : undefined,
          }"
        >
          <div class="d-flex flex-column h-100 p-5 pb-3 text-white text-shadow-1">
            <h3 class="pt-5 mt-5 mb-4 display-6 lh-1 fw-bold">{{ recurso.titulo }}</h3>
            <ul v-if="recurso.metadados" class="d-flex list-unstyled mt-auto">
              <li v-if="avatarUrl" class="me-auto">
                <img
                  :src="avatarUrl"
                  :alt="avatarAlt"
                  width="32"
                  height="32"
                  class="rounded-circle border border-white"
                />
              </li>
              <li
                v-for="meta in recurso.metadados"
                :key="meta.rotulo"
                class="d-flex align-items-center me-3"
              >
                <i
                  :class="'bi bi-' + meta.icone + ' me-2'"
                  width="1em"
                  height="1em"
                  aria-hidden="true"
                ></i>
                <small>{{ meta.rotulo }}</small>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- icon-grid: grade 4-col com ícone pequeno -->
    <div v-else-if="variante === 'icon-grid'" :class="colunasClasse()">
      <div v-for="(recurso, idx) in recursos" :key="idx" class="col d-flex align-items-start">
        <i
          :class="'bi bi-' + recurso.icone + ' text-body-secondary flex-shrink-0 me-3'"
          style="font-size: 1.75em"
          aria-hidden="true"
        ></i>
        <div>
          <h3 class="fw-bold mb-0 fs-4 text-body-emphasis">{{ recurso.titulo }}</h3>
          <p>{{ recurso.descricao }}</p>
        </div>
      </div>
    </div>

    <!-- titulo-esquerda + icon-small: duas colunas -->
    <div
      v-else-if="variante === 'titulo-esquerda'"
      class="row row-cols-1 row-cols-md-2 align-items-md-center g-5 py-5"
    >
      <div class="col d-flex flex-column align-items-start gap-2">
        <h2 class="fw-bold text-body-emphasis">{{ tituloSecao }}</h2>
        <p class="text-body-secondary" v-html="recursos[0]?.descricao"></p>
        <a v-if="recursos[0]?.url" :href="recursos[0].url" class="btn btn-primary btn-lg">{{
          recursos[0].rotuloAcao
        }}</a>
      </div>
      <div class="col">
        <div class="row row-cols-1 row-cols-sm-2 g-4">
          <div
            v-for="(recurso, idx) in recursos.slice(1)"
            :key="idx"
            class="col d-flex flex-column gap-2"
          >
            <div
              class="feature-icon-small d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-4 rounded-3"
            >
              <i :class="'bi bi-' + recurso.icone" width="1em" height="1em" aria-hidden="true"></i>
            </div>
            <h4 class="fw-semibold mb-0 text-body-emphasis">{{ recurso.titulo }}</h4>
            <p class="text-body-secondary">{{ recurso.descricao }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 0.75rem;
}
.icon-square {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
}
.text-shadow-1 {
  text-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.25);
}
.text-shadow-2 {
  text-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.25);
}
.text-shadow-3 {
  text-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.25);
}
.card-cover {
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
}
.feature-icon-small {
  width: 3rem;
  height: 3rem;
}
</style>
