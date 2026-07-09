<script setup lang="ts">
/**
 * RodapeSite - Componente de rodapé do site.
 *
 * Cinco variantes: simples (brand + links + copyright), social (ícones
 * de redes sociais), centralizado (nav + copyright centralizados),
 * colunas (5 colunas com seções), newsletter (formulário de inscrição
 * + redes sociais).
 *
 * API:
 * - variante: tipo de rodapé
 * - links: LinkNav[] — links de navegação
 * - secoes?: SecaoRodape[] — seções com links (colunas/newsletter)
 * - marcaAriaLabel?: string — aria-label do logo
 * - empresa?: string — nome da empresa no copyright
 * - empresaSuffix?: string — sufixo da empresa (ex: ", Inc")
 * - copyrightSuffix?: string — sufixo do copyright (ex: ". Todos os direitos reservados.")
 * - ano?: number
 * - urlInstagram?: string
 * - urlFacebook?: string
 * - rotuloInstagram?: string — aria-label do ícone Instagram
 * - rotuloFacebook?: string — aria-label do ícone Facebook
 * - newsletterTitulo?: string
 * - newsletterDescricao?: string
 * - newsletterPlaceholder?: string
 * - newsletterBotao?: string
 */

import type { LinkNav, SecaoRodape } from '@/tipos/componentes';

const props = withDefaults(
  defineProps<{
    variante: 'simples' | 'social' | 'centralizado' | 'colunas' | 'newsletter';
    links: LinkNav[];
    secoes?: SecaoRodape[];
    marcaAriaLabel?: string;
    empresa?: string;
    empresaSuffix?: string;
    copyrightSuffix?: string;
    ano?: number;
    urlInstagram?: string;
    urlFacebook?: string;
    rotuloInstagram?: string;
    rotuloFacebook?: string;
    newsletterTitulo?: string;
    newsletterDescricao?: string;
    newsletterPlaceholder?: string;
    newsletterBotao?: string;
  }>(),
  {
    links: () => [],
    secoes: () => [],
    marcaAriaLabel: '',
    empresa: '',
    empresaSuffix: '',
    copyrightSuffix: '',
    ano: 2025,
    urlInstagram: '',
    urlFacebook: '',
    rotuloInstagram: '',
    rotuloFacebook: '',
    newsletterTitulo: '',
    newsletterDescricao: '',
    newsletterPlaceholder: '',
    newsletterBotao: '',
  },
);

const textoCopyright = `${props.empresa ? '&copy; ' + props.ano + ' ' + props.empresa + (props.empresaSuffix || '') : ''}`;
</script>

<template>
  <footer
    v-if="variante === 'simples'"
    class="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top"
  >
    <p class="col-md-4 mb-0 text-body-secondary" v-html="textoCopyright"></p>
    <a
      v-if="marcaAriaLabel"
      href="/"
      class="col-md-4 d-flex align-items-center justify-content-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none"
      :aria-label="marcaAriaLabel"
    >
      <i class="bi bi-bootstrap me-2" style="font-size: 1.5rem" aria-hidden="true"></i>
    </a>
    <ul class="nav col-md-4 justify-content-end">
      <li v-for="link in links" :key="link.rotulo" class="nav-item">
        <a :href="link.url" class="nav-link px-2 text-body-secondary">{{ link.rotulo }}</a>
      </li>
    </ul>
  </footer>

  <footer
    v-else-if="variante === 'social'"
    class="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top"
  >
    <div class="col-md-4 d-flex align-items-center">
      <a
        v-if="marcaAriaLabel"
        href="/"
        class="mb-3 me-2 mb-md-0 text-body-secondary text-decoration-none lh-1"
        :aria-label="marcaAriaLabel"
      >
        <i class="bi bi-bootstrap" style="font-size: 1.5rem" aria-hidden="true"></i>
      </a>
      <span class="mb-3 mb-md-0 text-body-secondary" v-html="textoCopyright"></span>
    </div>
    <ul class="nav col-md-4 justify-content-end list-unstyled d-flex">
      <li v-if="urlInstagram" class="ms-3">
        <a
          class="text-body-secondary"
          :href="urlInstagram"
          :aria-label="rotuloInstagram || 'Instagram'"
        >
          <i class="bi bi-instagram" style="font-size: 1.5rem"></i>
        </a>
      </li>
      <li v-if="urlFacebook" class="ms-3">
        <a
          class="text-body-secondary"
          :href="urlFacebook"
          :aria-label="rotuloFacebook || 'Facebook'"
        >
          <i class="bi bi-facebook" style="font-size: 1.5rem"></i>
        </a>
      </li>
    </ul>
  </footer>

  <footer v-else-if="variante === 'centralizado'" class="py-3 my-4">
    <ul class="nav justify-content-center border-bottom pb-3 mb-3">
      <li v-for="link in links" :key="link.rotulo" class="nav-item">
        <a :href="link.url" class="nav-link px-2 text-body-secondary">{{ link.rotulo }}</a>
      </li>
    </ul>
    <p class="text-center text-body-secondary" v-html="textoCopyright"></p>
  </footer>

  <footer
    v-else-if="variante === 'colunas'"
    class="row row-cols-1 row-cols-sm-2 row-cols-md-5 py-5 my-5 border-top"
  >
    <div class="col mb-3">
      <a
        v-if="marcaAriaLabel"
        href="/"
        class="d-flex align-items-center mb-3 link-body-emphasis text-decoration-none"
        :aria-label="marcaAriaLabel"
      >
        <i class="bi bi-bootstrap me-2" style="font-size: 1.5rem" aria-hidden="true"></i>
      </a>
      <p class="text-body-secondary">&copy; {{ ano }}</p>
    </div>
    <div class="col mb-3"></div>
    <div v-for="(secao, idx) in secoes" :key="idx" class="col mb-3">
      <h5>{{ secao.titulo }}</h5>
      <ul class="nav flex-column">
        <li v-for="link in secao.links" :key="link.rotulo" class="nav-item mb-2">
          <a :href="link.url" class="nav-link p-0 text-body-secondary">{{ link.rotulo }}</a>
        </li>
      </ul>
    </div>
  </footer>

  <footer v-else-if="variante === 'newsletter'" class="py-5">
    <div class="row">
      <div v-for="(secao, idx) in secoes.slice(0, 3)" :key="idx" class="col-6 col-md-2 mb-3">
        <h5>{{ secao.titulo }}</h5>
        <ul class="nav flex-column">
          <li v-for="link in secao.links" :key="link.rotulo" class="nav-item mb-2">
            <a :href="link.url" class="nav-link p-0 text-body-secondary">{{ link.rotulo }}</a>
          </li>
        </ul>
      </div>
      <div v-if="newsletterTitulo" class="col-md-5 offset-md-1 mb-3">
        <form>
          <h5>{{ newsletterTitulo }}</h5>
          <p v-if="newsletterDescricao">{{ newsletterDescricao }}</p>
          <div class="d-flex flex-column flex-sm-row w-100 gap-2">
            <label for="newsletter-email" class="visually-hidden">Email</label>
            <input
              id="newsletter-email"
              type="email"
              class="form-control"
              :placeholder="newsletterPlaceholder"
            />
            <button v-if="newsletterBotao" class="btn btn-primary" type="button">
              {{ newsletterBotao }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <div
      v-if="textoCopyright || urlInstagram || urlFacebook"
      class="d-flex flex-column flex-sm-row justify-content-between py-4 my-4 border-top"
    >
      <p v-if="textoCopyright" v-html="textoCopyright"></p>
      <ul class="list-unstyled d-flex">
        <li v-if="urlInstagram" class="ms-3">
          <a
            class="link-body-emphasis"
            :href="urlInstagram"
            :aria-label="rotuloInstagram || 'Instagram'"
          >
            <i class="bi bi-instagram" style="font-size: 1.5rem"></i>
          </a>
        </li>
        <li v-if="urlFacebook" class="ms-3">
          <a
            class="link-body-emphasis"
            :href="urlFacebook"
            :aria-label="rotuloFacebook || 'Facebook'"
          >
            <i class="bi bi-facebook" style="font-size: 1.5rem"></i>
          </a>
        </li>
      </ul>
    </div>
  </footer>
</template>
