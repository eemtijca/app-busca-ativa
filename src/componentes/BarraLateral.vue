<script setup lang="ts">
/**
 * BarraLateral - Componente de barra lateral de navegação.
 *
 * Cinco variantes: escura (text-bg-dark 280px), clara (bg-body-tertiary 280px),
 * ícones (4.5rem somente ícones), colapsável (árvore com btn-toggle + collapse),
 * lista (list-group scrollable 380px). Suporta avatar do usuário e dropdown.
 *
 * API:
 * - variante: 'escura' | 'clara' | 'icones' | 'colapsavel' | 'lista'
 * - itens: ItemSidebar[] — itens de navegação (suporta aninhamento em colapsavel)
 * - modelValue?: string — id do item ativo (v-model)
 * - marca?: string — título da sidebar
 * - nomeUsuario?: string
 * - avatarSrc?: string
 * - itensDropdown?: DropdownItem[] — itens do dropdown do usuário
 * - iconeTooltip?: string — tooltip para variante icones
 * - @update:modelValue — emitido ao selecionar um item
 */

import { ref } from 'vue';
import type { ItemSidebar, DropdownItem } from '@/tipos/componentes';

withDefaults(
  defineProps<{
    variante: 'escura' | 'clara' | 'icones' | 'colapsavel' | 'lista';
    itens: ItemSidebar[];
    modelValue?: string;
    marca?: string;
    nomeUsuario?: string;
    avatarSrc?: string;
    itensDropdown?: DropdownItem[];
    iconeTooltip?: string;
  }>(),
  {
    modelValue: '',
    marca: '',
    nomeUsuario: '',
    avatarSrc: '',
    itensDropdown: () => [],
    iconeTooltip: '',
  },
);

const emit = defineEmits<{
  'update:modelValue': [id: string];
}>();

const colapsoAberto = ref<Record<string, boolean>>({});

function toggleColapso(id: string) {
  colapsoAberto.value[id] = !colapsoAberto.value[id];
}

function selecionar(id: string) {
  emit('update:modelValue', id);
}
</script>

<template>
  <!-- escura: text-bg-dark 280px -->
  <div
    v-if="variante === 'escura'"
    class="d-flex flex-column flex-shrink-0 p-3 text-bg-dark"
    style="width: 280px"
  >
    <a
      v-if="marca"
      href="/"
      class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none"
    >
      <i class="bi bi-bootstrap pe-none me-2" style="font-size: 1.5rem" aria-hidden="true"></i>
      <span class="fs-4">{{ marca }}</span>
    </a>
    <hr v-if="marca" />
    <ul class="nav nav-pills flex-column mb-auto">
      <li v-for="item in itens" :key="item.id" class="nav-item">
        <a
          :href="item.url || undefined"
          class="nav-link"
          :class="{ active: modelValue === item.id, 'text-white': modelValue !== item.id }"
          :aria-current="modelValue === item.id ? 'page' : undefined"
          @click.prevent="selecionar(item.id)"
        >
          <i
            :class="'bi bi-' + item.icone + ' pe-none me-2'"
            width="16"
            height="16"
            aria-hidden="true"
          ></i>
          {{ item.rotulo }}
        </a>
      </li>
    </ul>
    <hr v-if="itensDropdown.length" />
    <div v-if="itensDropdown.length" class="dropdown">
      <a
        href="#"
        class="d-flex align-items-center text-white text-decoration-none dropdown-toggle"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          alt=""
          width="32"
          height="32"
          class="rounded-circle me-2"
        />
        <strong>{{ nomeUsuario }}</strong>
      </a>
      <ul class="dropdown-menu dropdown-menu-dark text-small shadow">
        <template v-for="item in itensDropdown" :key="item.rotulo">
          <li v-if="item.dividir"><hr class="dropdown-divider" /></li>
          <li v-else>
            <a class="dropdown-item" :href="item.url || '#'">{{ item.rotulo }}</a>
          </li>
        </template>
      </ul>
    </div>
  </div>

  <!-- clara: bg-body-tertiary 280px -->
  <div
    v-else-if="variante === 'clara'"
    class="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary"
    style="width: 280px"
  >
    <a
      v-if="marca"
      href="/"
      class="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none"
    >
      <i class="bi bi-bootstrap pe-none me-2" style="font-size: 1.5rem" aria-hidden="true"></i>
      <span class="fs-4">{{ marca }}</span>
    </a>
    <hr v-if="marca" />
    <ul class="nav nav-pills flex-column mb-auto">
      <li v-for="item in itens" :key="item.id" class="nav-item">
        <a
          :href="item.url || undefined"
          class="nav-link"
          :class="{ active: modelValue === item.id }"
          :aria-current="modelValue === item.id ? 'page' : undefined"
          @click.prevent="selecionar(item.id)"
        >
          <i
            :class="'bi bi-' + item.icone + ' pe-none me-2'"
            width="16"
            height="16"
            aria-hidden="true"
          ></i>
          {{ item.rotulo }}
        </a>
      </li>
    </ul>
    <hr v-if="itensDropdown.length" />
    <div v-if="itensDropdown.length" class="dropdown">
      <a
        href="#"
        class="d-flex align-items-center link-body-emphasis text-decoration-none dropdown-toggle"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          alt=""
          width="32"
          height="32"
          class="rounded-circle me-2"
        />
        <strong>{{ nomeUsuario }}</strong>
      </a>
      <ul class="dropdown-menu text-small shadow">
        <template v-for="item in itensDropdown" :key="item.rotulo">
          <li v-if="item.dividir"><hr class="dropdown-divider" /></li>
          <li v-else>
            <a class="dropdown-item" :href="item.url || '#'">{{ item.rotulo }}</a>
          </li>
        </template>
      </ul>
    </div>
  </div>

  <!-- icones: icon-only 4.5rem -->
  <div
    v-else-if="variante === 'icones'"
    class="d-flex flex-column flex-shrink-0 bg-body-tertiary"
    style="width: 4.5rem"
  >
    <a
      v-if="iconeTooltip"
      href="/"
      class="d-block p-3 link-body-emphasis text-decoration-none"
      :title="iconeTooltip"
      data-bs-toggle="tooltip"
      data-bs-placement="right"
    >
      <i class="bi bi-bootstrap pe-none" style="font-size: 1.5rem" aria-hidden="true"></i>
      <span class="visually-hidden">{{ iconeTooltip }}</span>
    </a>
    <ul class="nav nav-pills nav-flush flex-column mb-auto text-center">
      <li v-for="item in itens" :key="item.id" class="nav-item">
        <a
          :href="item.url || undefined"
          class="nav-link py-3 border-bottom rounded-0"
          :class="{ active: modelValue === item.id }"
          :aria-current="modelValue === item.id ? 'page' : undefined"
          :title="item.rotulo"
          data-bs-toggle="tooltip"
          data-bs-placement="right"
          @click.prevent="selecionar(item.id)"
        >
          <i
            :class="'bi bi-' + item.icone + ' pe-none'"
            style="font-size: 1.5rem"
            role="img"
            :aria-label="item.rotulo"
          ></i>
        </a>
      </li>
    </ul>
    <div v-if="itensDropdown.length" class="dropdown border-top">
      <a
        href="#"
        class="d-flex align-items-center justify-content-center p-3 link-body-emphasis text-decoration-none dropdown-toggle"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          :alt="nomeUsuario"
          width="24"
          height="24"
          class="rounded-circle"
        />
      </a>
      <ul class="dropdown-menu text-small shadow">
        <template v-for="item in itensDropdown" :key="item.rotulo">
          <li v-if="item.dividir"><hr class="dropdown-divider" /></li>
          <li v-else>
            <a class="dropdown-item" :href="item.url || '#'">{{ item.rotulo }}</a>
          </li>
        </template>
      </ul>
    </div>
  </div>

  <!-- colapsavel: 280px com arvore collapse -->
  <div v-else-if="variante === 'colapsavel'" class="flex-shrink-0 p-3" style="width: 280px">
    <a
      v-if="marca"
      href="/"
      class="d-flex align-items-center pb-3 mb-3 link-body-emphasis text-decoration-none border-bottom"
    >
      <i class="bi bi-bootstrap pe-none me-2" style="font-size: 1.5rem" aria-hidden="true"></i>
      <span class="fs-5 fw-semibold">{{ marca }}</span>
    </a>
    <ul class="list-unstyled ps-0">
      <li v-for="item in itens" :key="item.id" class="mb-1">
        <button
          v-if="item.filhos && item.filhos.length"
          class="btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed"
          :class="{ collapsed: !colapsoAberto[item.id] }"
          :aria-expanded="colapsoAberto[item.id] ? 'true' : 'false'"
          @click="toggleColapso(item.id)"
        >
          {{ item.rotulo }}
        </button>
        <a
          v-else
          :href="item.url || undefined"
          class="link-body-emphasis d-inline-flex text-decoration-none rounded"
          :class="{ 'fw-semibold': modelValue === item.id }"
          @click.prevent="selecionar(item.id)"
        >
          {{ item.rotulo }}
        </a>
        <div
          v-if="item.filhos && item.filhos.length"
          class="collapse"
          :class="{ show: colapsoAberto[item.id] }"
        >
          <ul class="btn-toggle-nav list-unstyled fw-normal pb-1 small">
            <li v-for="filho in item.filhos" :key="filho.id">
              <a
                :href="filho.url || undefined"
                class="link-body-emphasis d-inline-flex text-decoration-none rounded"
                :class="{ 'fw-semibold': modelValue === filho.id }"
                @click.prevent="selecionar(filho.id)"
              >
                {{ filho.rotulo }}
              </a>
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </div>

  <!-- lista: 380px com list-group scrollarea -->
  <div
    v-else-if="variante === 'lista'"
    class="d-flex flex-column align-items-stretch flex-shrink-0 bg-body-tertiary"
    style="width: 380px"
  >
    <a
      v-if="marca"
      href="/"
      class="d-flex align-items-center flex-shrink-0 p-3 link-body-emphasis text-decoration-none border-bottom"
    >
      <i class="bi bi-bootstrap pe-none me-2" style="font-size: 1.5rem" aria-hidden="true"></i>
      <span class="fs-5 fw-semibold">{{ marca }}</span>
    </a>
    <div class="list-group list-group-flush border-bottom scrollarea">
      <a
        v-for="item in itens"
        :key="item.id"
        :href="item.url || undefined"
        class="list-group-item list-group-item-action py-3 lh-sm"
        :class="{ active: modelValue === item.id }"
        :aria-current="modelValue === item.id ? 'true' : undefined"
        @click.prevent="selecionar(item.id)"
      >
        <div class="d-flex w-100 align-items-center justify-content-between">
          <strong class="mb-1">{{ item.rotulo }}</strong>
          <small v-if="item.data" :class="{ 'text-body-secondary': modelValue !== item.id }">{{
            item.data
          }}</small>
        </div>
        <div v-if="item.descricao" class="col-10 mb-1 small">{{ item.descricao }}</div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.dropdown-toggle {
  outline: 0;
}
.btn-toggle {
  padding: 0.25rem 0.5rem;
  font-weight: 600;
  color: var(--bs-emphasis-color);
  background-color: transparent;
}
.btn-toggle:hover,
.btn-toggle:focus {
  color: rgba(var(--bs-emphasis-color-rgb), 0.85);
  background-color: var(--bs-tertiary-bg);
}
.btn-toggle::before {
  width: 1.25em;
  line-height: 0;
  content: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='rgba%280,0,0,.5%29' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5 14l6-6-6-6'/%3e%3c/svg%3e");
  transition: transform 0.35s ease;
  transform-origin: 0.5em 50%;
}
.btn-toggle[aria-expanded='true'] {
  color: rgba(var(--bs-emphasis-color-rgb), 0.85);
}
.btn-toggle[aria-expanded='true']::before {
  transform: rotate(90deg);
}
.btn-toggle-nav a {
  padding: 0.1875rem 0.5rem;
  margin-top: 0.125rem;
  margin-left: 1.25rem;
}
.btn-toggle-nav a:hover,
.btn-toggle-nav a:focus {
  background-color: var(--bs-tertiary-bg);
}
.scrollarea {
  overflow-y: auto;
}
</style>
