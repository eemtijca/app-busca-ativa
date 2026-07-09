<script setup lang="ts">
/**
 * CartaoPostagem - Cartão de postagem para blog.
 *
 * Três variantes: card (cartão horizontal com thumbnail e categoria),
 * destaque (hero banner no topo do blog), completo (artigo com metadados).
 *
 * API:
 * - postagem: Postagem — { titulo, resumo, data, autor, categoria?, imagemUrl? }
 * - variante?: 'card' | 'destaque' | 'completo'
 * - urlPostagem?: string — URL do link "Continuar lendo"
 * - urlAutor?: string — URL do link do autor
 * - rotuloAcao?: string — texto do link de ação
 */

import type { Postagem } from '@/tipos/componentes';

withDefaults(
  defineProps<{
    postagem: Postagem;
    variante?: 'card' | 'destaque' | 'completo';
    urlPostagem?: string;
    urlAutor?: string;
    rotuloAcao?: string;
  }>(),
  { variante: 'card', urlPostagem: '', urlAutor: '', rotuloAcao: '' },
);
</script>

<template>
  <!-- card: blog post card horizontal -->
  <div
    v-if="variante === 'card'"
    class="row g-0 border rounded overflow-hidden flex-md-row mb-4 shadow-sm h-md-250 position-relative"
  >
    <div class="col p-4 d-flex flex-column position-static">
      <strong
        v-if="postagem.categoria"
        class="d-inline-block mb-2"
        :class="'text-' + (postagem.categoria === 'Design' ? 'success' : 'primary') + '-emphasis'"
      >
        {{ postagem.categoria }}
      </strong>
      <h3 class="mb-0">{{ postagem.titulo }}</h3>
      <div class="mb-1 text-body-secondary">{{ postagem.data }}</div>
      <p class="card-text mb-auto">{{ postagem.resumo }}</p>
      <a
        v-if="urlPostagem"
        :href="urlPostagem"
        class="icon-link gap-1 icon-link-hover stretched-link"
      >
        {{ rotuloAcao || 'Continuar lendo' }}
        <i class="bi bi-chevron-right" aria-hidden="true"></i>
      </a>
    </div>
    <div v-if="postagem.imagemUrl" class="col-auto d-none d-lg-block">
      <img :src="postagem.imagemUrl" width="200" height="250" alt="" class="bd-placeholder-img" />
    </div>
  </div>

  <!-- destaque: blog post featured hero -->
  <div v-else-if="variante === 'destaque'">
    <div class="p-4 p-md-5 mb-4 rounded text-body-emphasis bg-body-secondary">
      <div class="col-lg-6 px-0">
        <h1 class="display-4 fst-italic">{{ postagem.titulo }}</h1>
        <p class="lead my-3">{{ postagem.resumo }}</p>
        <p v-if="urlPostagem" class="lead mb-0">
          <a :href="urlPostagem" class="text-body-emphasis fw-bold">{{
            rotuloAcao || 'Continuar lendo...'
          }}</a>
        </p>
      </div>
    </div>
  </div>

  <!-- completo: artigo completo com meta -->
  <article v-else-if="variante === 'completo'" class="blog-post">
    <h2 class="display-5 link-body-emphasis mb-1">{{ postagem.titulo }}</h2>
    <p class="blog-post-meta">
      {{ postagem.data }} por
      <a v-if="urlAutor" :href="urlAutor">{{ postagem.autor }}</a>
      <template v-else>{{ postagem.autor }}</template>
    </p>
    <p>{{ postagem.resumo }}</p>
  </article>
</template>

<style scoped>
.h-md-250 {
  height: 250px;
}
@media (min-width: 768px) {
  .h-md-250 {
    height: 250px;
  }
}
.blog-post {
  margin-bottom: 4rem;
}
.blog-post-meta {
  margin-bottom: 1.25rem;
  color: #727272;
}
</style>
