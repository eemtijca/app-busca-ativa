<script setup lang="ts">
/**
 * HeroSecao - Seção hero (destaque principal) com múltiplos layouts.
 *
 * Seis variantes: centrado (texto + botões centralizados), screenshot
 * (com imagem abaixo), imagem (imagem à direita), formulário (slot com
 * formulário ao lado), borda (borda arredondada com sombra), escuro
 * (fundo dark).
 *
 * API:
 * - titulo: string
 * - descricao: string
 * - variante: tipo de layout
 * - imagemSrc?: string — URL da imagem
 * - imagemAlt?: string — texto alternativo da imagem
 * - acoes?: AcaoHero[] — botões de ação
 * - slot 'formulario': usado na variante 'formulario'
 */

import type { AcaoHero } from '@/tipos/componentes';

withDefaults(
  defineProps<{
    titulo: string;
    descricao: string;
    variante: 'centrado' | 'screenshot' | 'imagem' | 'formulario' | 'borda' | 'escuro';
    imagemSrc?: string;
    imagemAlt?: string;
    acoes?: AcaoHero[];
  }>(),
  {
    imagemSrc: '',
    imagemAlt: '',
    acoes: () => [],
  },
);
</script>

<template>
  <div v-if="variante === 'centrado'" class="px-4 py-5 my-5 text-center">
    <h1 class="display-5 fw-bold text-body-emphasis">{{ titulo }}</h1>
    <div class="col-lg-6 mx-auto">
      <p class="lead mb-4">{{ descricao }}</p>
      <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
        <button
          v-for="(acao, idx) in acoes"
          :key="idx"
          :class="[
            'btn',
            acao.destaque
              ? `btn-${acao.variante} btn-lg px-4 gap-3`
              : `btn-${acao.variante} btn-lg px-4`,
          ]"
          type="button"
        >
          {{ acao.rotulo }}
        </button>
      </div>
    </div>
  </div>

  <div v-else-if="variante === 'screenshot'" class="px-4 pt-5 my-5 text-center border-bottom">
    <h1 class="display-4 fw-bold text-body-emphasis">{{ titulo }}</h1>
    <div class="col-lg-6 mx-auto">
      <p class="lead mb-4">{{ descricao }}</p>
      <div class="d-grid gap-2 d-sm-flex justify-content-sm-center mb-5">
        <button
          v-for="(acao, idx) in acoes"
          :key="idx"
          :class="[
            'btn',
            idx === 0 ? 'btn-primary btn-lg px-4 me-sm-3' : `btn-${acao.variante} btn-lg px-4`,
          ]"
          type="button"
        >
          {{ acao.rotulo }}
        </button>
      </div>
    </div>
    <div class="overflow-hidden" style="max-height: 30vh">
      <div class="container px-5">
        <img
          v-if="imagemSrc"
          :src="imagemSrc"
          class="img-fluid border rounded-3 shadow-lg mb-4"
          :alt="imagemAlt"
          width="700"
          height="500"
          loading="lazy"
        />
      </div>
    </div>
  </div>

  <div v-else-if="variante === 'imagem'" class="container col-xxl-8 px-4 py-5">
    <div class="row flex-lg-row-reverse align-items-center g-5 py-5">
      <div class="col-10 col-sm-8 col-lg-6">
        <img
          v-if="imagemSrc"
          :src="imagemSrc"
          class="d-block mx-lg-auto img-fluid"
          :alt="imagemAlt"
          width="700"
          height="500"
          loading="lazy"
        />
      </div>
      <div class="col-lg-6">
        <h1 class="display-5 fw-bold text-body-emphasis lh-1 mb-3">{{ titulo }}</h1>
        <p class="lead">{{ descricao }}</p>
        <div class="d-grid gap-2 d-md-flex justify-content-md-start">
          <button
            v-for="(acao, idx) in acoes"
            :key="idx"
            :class="[
              'btn',
              idx === 0 ? 'btn-primary btn-lg px-4 me-md-2' : `btn-${acao.variante} btn-lg px-4`,
            ]"
            type="button"
          >
            {{ acao.rotulo }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="variante === 'formulario'" class="container col-xl-10 col-xxl-8 px-4 py-5">
    <div class="row align-items-center g-lg-5 py-5">
      <div class="col-lg-7 text-center text-lg-start">
        <h1 class="display-4 fw-bold lh-1 text-body-emphasis mb-3">{{ titulo }}</h1>
        <p class="col-lg-10 fs-4">{{ descricao }}</p>
      </div>
      <div class="col-md-10 mx-auto col-lg-5">
        <slot name="formulario" />
      </div>
    </div>
  </div>

  <div v-else-if="variante === 'borda'" class="container my-5">
    <div class="row p-4 pb-0 pe-lg-0 pt-lg-5 align-items-center rounded-3 border shadow-lg">
      <div class="col-lg-7 p-3 p-lg-5 pt-lg-3">
        <h1 class="display-4 fw-bold lh-1 text-body-emphasis">{{ titulo }}</h1>
        <p class="lead">{{ descricao }}</p>
        <div class="d-grid gap-2 d-md-flex justify-content-md-start mb-4 mb-lg-3">
          <button
            v-for="(acao, idx) in acoes"
            :key="idx"
            :class="[
              'btn',
              idx === 0
                ? `btn-${acao.variante} btn-lg px-4 me-md-2 fw-bold`
                : `btn-${acao.variante} btn-lg px-4`,
            ]"
            type="button"
          >
            {{ acao.rotulo }}
          </button>
        </div>
      </div>
      <div class="col-lg-4 offset-lg-1 p-0 overflow-hidden shadow-lg">
        <img v-if="imagemSrc" :src="imagemSrc" class="rounded-lg-3" :alt="imagemAlt" width="720" />
      </div>
    </div>
  </div>

  <div v-else-if="variante === 'escuro'" class="bg-dark text-secondary px-4 py-5 text-center">
    <div class="py-5">
      <h1 class="display-5 fw-bold text-white">{{ titulo }}</h1>
      <div class="col-lg-6 mx-auto">
        <p class="fs-5 mb-4">{{ descricao }}</p>
        <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
          <button
            v-for="(acao, idx) in acoes"
            :key="idx"
            :class="[
              'btn',
              idx === 0
                ? `btn-${acao.variante} btn-lg px-4 me-sm-3 fw-bold`
                : `btn-${acao.variante} btn-lg px-4`,
            ]"
            type="button"
          >
            {{ acao.rotulo }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (min-width: 992px) {
  .rounded-lg-3 {
    border-radius: 0.3rem;
  }
}
</style>
