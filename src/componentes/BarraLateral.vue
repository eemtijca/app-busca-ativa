<script setup lang="ts">
/**
 * BarraLateral - Barra lateral de navegação da aplicação.
 *
 * Modelada a partir do exemplo "Dashboard" do Bootstrap 5.3:
 *   https://getbootstrap.com/docs/5.3/examples/dashboard/
 *
 * Comportamento responsivo:
 *   - Mobile (< lg): offcanvas lateral (offcanvas-start), aberto via
 *     botão hamburger no CabecalhoNavegacao. Fecha ao clicar em item.
 *   - Desktop (>= lg): coluna fixa (sticky top), sempre visível.
 *
 * Variantes legadas (escura, clara, icones, colapsavel, lista) foram
 * preservadas para uso em outras telas, mas a variante principal da
 * aplicação é 'dashboard'.
 *
 * API:
 *   - variante: 'dashboard' | 'escura' | 'clara' | 'icones' | 'colapsavel' | 'lista'
 *   - itens: ItemSidebar[] — links de navegação (suporta badge)
 *   - modelValue?: string — id do item ativo (v-model)
 *   - marca?: string — título da sidebar
 *   - nomeUsuario?: string
 *   - avatarSrc?: string
 *   - itensDropdown?: DropdownItem[] — itens do dropdown do usuário
 *   - iconeTooltip?: string — tooltip para variante icones
 *   - idOffcanvas?: string — id do offcanvas para ligação com o toggler
 *   - @update:modelValue — emitido ao selecionar um item
 *   - @navegar — emitido ao clicar em item com url (para integração com vue-router)
 */

import { ref, computed } from 'vue';
import { Offcanvas } from 'bootstrap';
import type { ItemSidebar, DropdownItem } from '@/tipos/componentes';

const props = withDefaults(
  defineProps<{
    variante: 'dashboard' | 'escura' | 'clara' | 'icones' | 'colapsavel' | 'lista';
    itens: ItemSidebar[];
    modelValue?: string;
    marca?: string;
    nomeUsuario?: string;
    avatarSrc?: string;
    itensDropdown?: DropdownItem[];
    iconeTooltip?: string;
    idOffcanvas?: string;
  }>(),
  {
    modelValue: '',
    marca: '',
    nomeUsuario: '',
    avatarSrc: '',
    itensDropdown: () => [],
    iconeTooltip: '',
    idOffcanvas: 'barraLateralOffcanvas',
  },
);

const emit = defineEmits<{
  'update:modelValue': [id: string];
  navegar: [item: ItemSidebar];
}>();

const colapsoAberto = ref<Record<string, boolean>>({});

const idOffcanvasComputado = computed(() => props.idOffcanvas || 'barraLateralOffcanvas');

function toggleColapso(id: string) {
  colapsoAberto.value[id] = !colapsoAberto.value[id];
}

function selecionar(item: ItemSidebar) {
  emit('update:modelValue', item.id);
  emit('navegar', item);
  // Em mobile, após clicar, fecha o offcanvas automaticamente
  if (props.variante === 'dashboard') {
    const el = document.getElementById(idOffcanvasComputado.value);
    if (el) {
      const instancia = Offcanvas.getInstance(el);
      instancia?.hide();
    }
  }
}
</script>

<template>
  <!--
    Variante 'dashboard': offcanvas-lg offcanvas-start no mobile,
    coluna sticky no desktop. Modelo do exemplo dashboard do Bootstrap.
  -->
  <div v-if="variante === 'dashboard'" class="sidebar border-end bg-body-tertiary">
    <div
      class="offcanvas-lg offcanvas-start bg-body-tertiary"
      tabindex="-1"
      :id="idOffcanvasComputado"
      :aria-labelledby="idOffcanvasComputado + 'Label'"
    >
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title fw-bold" :id="idOffcanvasComputado + 'Label'">
          <i class="bi bi-mortarboard-fill text-primary me-2" aria-hidden="true"></i>
          <span v-if="marca">{{ marca }}</span>
          <span v-else>Busca Ativa</span>
        </h5>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="offcanvas"
          :data-bs-target="'#' + idOffcanvasComputado"
          aria-label="Fechar menu de navegação"
        ></button>
      </div>
      <div class="offcanvas-body p-0">
        <nav :aria-label="'Navegação principal'">
          <ul class="nav nav-pills flex-column p-2 gap-1">
            <li v-for="item in itens" :key="item.id" class="nav-item">
              <a
                :href="item.url || '#'"
                class="nav-link d-flex align-items-center gap-2 rounded-2"
                :class="{ active: modelValue === item.id }"
                :aria-current="modelValue === item.id ? 'page' : undefined"
                @click.prevent="selecionar(item)"
              >
                <i :class="'bi bi-' + item.icone" aria-hidden="true"></i>
                <span class="flex-grow-1">{{ item.rotulo }}</span>
                <span
                  v-if="item.badge !== undefined && item.badge !== null && item.badge !== ''"
                  class="badge rounded-pill"
                  :class="modelValue === item.id ? 'text-bg-light' : 'text-bg-secondary'"
                >
                  {{ item.badge }}
                </span>
              </a>
            </li>
          </ul>
        </nav>

        <!-- Área do usuário no rodapé da sidebar -->
        <div v-if="nomeUsuario || itensDropdown.length" class="border-top p-2 mt-auto">
          <div v-if="itensDropdown.length" class="dropdown">
            <button
              type="button"
              class="btn btn-light d-flex align-items-center gap-2 w-100 text-start rounded-2 p-2"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span
                v-if="avatarSrc"
                class="rounded-circle overflow-hidden flex-shrink-0"
                style="width: 32px; height: 32px"
              >
                <img :src="avatarSrc" alt="" class="w-100 h-100 object-fit-cover" />
              </span>
              <span
                v-else
                class="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle flex-shrink-0"
                style="width: 32px; height: 32px"
                aria-hidden="true"
              >
                <i class="bi bi-person-fill"></i>
              </span>
              <span class="flex-grow-1 text-truncate small fw-semibold">{{ nomeUsuario }}</span>
              <i class="bi bi-chevron-down small" aria-hidden="true"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end w-100 shadow">
              <template v-for="item in itensDropdown" :key="item.rotulo">
                <li v-if="item.dividir"><hr class="dropdown-divider" /></li>
                <li v-else>
                  <a class="dropdown-item d-flex align-items-center gap-2" :href="item.url || '#'">
                    <i v-if="item.icone" :class="'bi bi-' + item.icone" aria-hidden="true"></i>
                    {{ item.rotulo }}
                  </a>
                </li>
              </template>
            </ul>
          </div>
          <div v-else class="d-flex align-items-center gap-2 p-2">
            <span
              class="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle flex-shrink-0"
              style="width: 32px; height: 32px"
              aria-hidden="true"
            >
              <i class="bi bi-person-fill"></i>
            </span>
            <span class="text-truncate small fw-semibold">{{ nomeUsuario }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!--
    Variantes legadas preservadas para compatibilidade.
    ====================================================
    escura: text-bg-dark 280px
  -->
  <div
    v-else-if="variante === 'escura'"
    class="d-flex flex-column flex-shrink-0 p-3 text-bg-dark"
    style="width: 280px"
  >
    <a
      v-if="marca"
      href="/"
      class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none"
    >
      <i
        class="bi bi-mortarboard-fill pe-none me-2"
        style="font-size: 1.5rem"
        aria-hidden="true"
      ></i>
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
          @click.prevent="selecionar(item)"
        >
          <i :class="'bi bi-' + item.icone + ' pe-none me-2'" aria-hidden="true"></i>
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
      <i
        class="bi bi-mortarboard-fill pe-none me-2"
        style="font-size: 1.5rem"
        aria-hidden="true"
      ></i>
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
          @click.prevent="selecionar(item)"
        >
          <i :class="'bi bi-' + item.icone + ' pe-none me-2'" aria-hidden="true"></i>
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
      <i class="bi bi-mortarboard-fill pe-none" style="font-size: 1.5rem" aria-hidden="true"></i>
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
          @click.prevent="selecionar(item)"
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
      <i
        class="bi bi-mortarboard-fill pe-none me-2"
        style="font-size: 1.5rem"
        aria-hidden="true"
      ></i>
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
          @click.prevent="selecionar(item)"
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
                @click.prevent="selecionar(filho)"
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
      <i
        class="bi bi-mortarboard-fill pe-none me-2"
        style="font-size: 1.5rem"
        aria-hidden="true"
      ></i>
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
        @click.prevent="selecionar(item)"
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
/**
 * Estilo da variante 'dashboard', baseado no exemplo
 * dashboard.css do Bootstrap 5.3.
 */
.sidebar {
  width: 100%;
  min-height: 100%;
}

@media (min-width: 992px) {
  .sidebar .offcanvas-lg {
    position: sticky;
    top: 0;
    transform: none;
    visibility: visible !important;
    height: 100vh !important;
  }
}

.sidebar .nav-link {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--bs-body-color);
}

.sidebar .nav-link:hover {
  background-color: var(--bs-tertiary-bg);
}

.sidebar .nav-link.active {
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
  font-weight: 600;
}

.sidebar .offcanvas-body {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 1px);
}

/* Variantes legadas */
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
