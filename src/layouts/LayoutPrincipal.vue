<script setup lang="ts">
/**
 * LayoutPrincipal - Layout raiz da aplicação.
 *
 * Estrutura (modelo do exemplo "dashboard" do Bootstrap 5.3):
 *   1. CabecalhoNavegacao (variante 'dashboard') — navbar escura
 *      sticky com botão hamburger, título da página (via slot
 *      #acoes injetado por cada view) e atalho de acessibilidade.
 *   2. Container fluido com:
 *      - BarraLateral (variante 'dashboard') à esquerda
 *        (offcanvas no mobile, sticky no desktop >= lg).
 *      - <router-view> à direita (conteúdo da página).
 *   3. Offcanvas global de Acessibilidade (TTS, contraste, fonte).
 *
 * O título da página e os botões contextuais são fornecidos por
 * cada HomeView via slot nomeado 'cabecalho' (template wrap).
 * Caso a view não forneça o slot, o LayoutPrincipal exibe um
 * título padrão genérico baseado na rota atual.
 */

import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useAcessibilidade } from '@/composables/useAcessibilidade';
import CabecalhoNavegacao from '@/componentes/CabecalhoNavegacao.vue';
import BarraLateral from '@/componentes/BarraLateral.vue';
import type { ItemSidebar, DropdownItem } from '@/tipos/componentes';

const router = useRouter();
const route = useRoute();

const { usuario, logout } = useAutenticacao();
const { lerTexto, alternarContraste, aumentarFonte, diminuirFonte } = useAcessibilidade();

// =========================================================
// Estado do menu lateral (offcanvas no mobile)
// =========================================================

/**
 * Mantém o id do item de menu ativo sincronizado com a rota.
 * Cada HomeView não precisa lidar com isso — o LayoutPrincipal
 * extrai da rota o nome e usa para destacar o item.
 */
const itemAtivo = ref(route.name as string);

watch(
  () => route.name,
  (novoNome) => {
    itemAtivo.value = (novoNome as string) ?? '';
  },
  { immediate: true },
);

function navegar(item: ItemSidebar) {
  if (item.url) {
    router.push(item.url);
  }
}

// =========================================================
// Itens do menu lateral — adaptados ao papel do usuário
// =========================================================

const itensSidebar = computed<ItemSidebar[]>(() => {
  const papel = usuario.value?.papel;
  if (papel === 'professor') {
    return [
      {
        id: 'professor',
        rotulo: 'Painel do Professor',
        icone: 'house',
        url: '/professor',
      },
      {
        id: 'professor-frequencia',
        rotulo: 'Registrar Frequência',
        icone: 'check2-square',
        url: '/professor',
      },
      {
        id: 'professor-ausencia',
        rotulo: 'Ausência em Aula',
        icone: 'clock-history',
        url: '/professor',
      },
      {
        id: 'professor-ocorrencia',
        rotulo: 'Ocorrência Grave',
        icone: 'exclamation-triangle',
        url: '/professor',
      },
    ];
  }
  if (papel === 'gestao') {
    return [
      {
        id: 'gestao',
        rotulo: 'Painel Confidencial',
        icone: 'shield-lock',
        url: '/gestao',
      },
      {
        id: 'gestao-ranking',
        rotulo: 'Ranking de Risco',
        icone: 'bar-chart',
        url: '/gestao',
      },
      {
        id: 'gestao-ocorrencias',
        rotulo: 'Ocorrências Graves',
        icone: 'exclamation-octagon',
        url: '/gestao',
      },
      {
        id: 'gestao-bloqueio',
        rotulo: 'Bloqueio de Retorno',
        icone: 'lock',
        url: '/gestao',
      },
      {
        id: 'gestao-justificativas',
        rotulo: 'Justificativas',
        icone: 'clipboard-check',
        url: '/gestao',
      },
    ];
  }
  if (papel === 'responsavel') {
    return [
      {
        id: 'responsavel',
        rotulo: 'Início',
        icone: 'house',
        url: '/responsavel',
      },
      {
        id: 'responsavel-alertas',
        rotulo: 'Alertas',
        icone: 'bell',
        url: '/responsavel',
      },
      {
        id: 'responsavel-termometro',
        rotulo: 'Termômetro',
        icone: 'thermometer-half',
        url: '/responsavel',
      },
      {
        id: 'responsavel-justificativa',
        rotulo: 'Enviar Justificativa',
        icone: 'paperclip',
        url: '/responsavel',
      },
      {
        id: 'responsavel-chat',
        rotulo: 'Falar com Coordenação',
        icone: 'chat-dots',
        url: '/responsavel',
      },
    ];
  }
  return [];
});

// =========================================================
// Dropdown do usuário
// =========================================================

const itensDropdown = computed<DropdownItem[]>(() => [
  {
    rotulo: 'Sair da conta',
    icone: 'box-arrow-right',
    dividir: false,
  },
]);

async function handleLogout(): Promise<void> {
  await logout();
  await router.push('/');
}

function selecionarDropdownItem(item: DropdownItem) {
  if (item.rotulo === 'Sair da conta') {
    handleLogout();
  }
}

// =========================================================
// Título da página derivado da rota
// =========================================================

const tituloPagina = computed(() => {
  switch (route.name) {
    case 'professor':
      return 'Painel do Professor';
    case 'gestao':
      return 'Painel da Gestão';
    case 'responsavel':
      return 'Painel da Família';
    default:
      return 'Busca Ativa Escolar';
  }
});

const subtituloPagina = computed(() => {
  const nome = usuario.value?.nome;
  if (!nome) return '';
  return 'Olá, ' + nome;
});

// =========================================================
// Acessibilidade: ler tela
// =========================================================

function lerTela(): void {
  // Captura apenas o conteúdo principal visível para não ler a navbar
  const main = document.getElementById('conteudoPrincipal');
  const texto = main ? main.innerText : document.body.innerText;
  lerTexto(texto);
}
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <!--
      Navbar contextual. Os slots #acoes e #usuario recebem
      conteúdo utilitário: atalho de acessibilidade (interno ao
      componente) + menu do usuário.
    -->
    <CabecalhoNavegacao
      variante="dashboard"
      :itens="[]"
      marca="Busca Ativa"
      :titulo-pagina="tituloPagina"
      :subtitulo-pagina="subtituloPagina"
    >
      <template #usuario>
        <div class="dropdown">
          <button
            type="button"
            class="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            :aria-label="'Menu do usuário ' + (usuario?.nome || '')"
          >
            <i class="bi bi-person-circle" aria-hidden="true"></i>
            <span class="d-none d-md-inline text-truncate" style="max-width: 140px">
              {{ usuario?.nome || 'Conta' }}
            </span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow">
            <li>
              <h6 class="dropdown-header">
                <i class="bi bi-person me-1" aria-hidden="true"></i>
                {{ usuario?.nome || 'Usuário' }}
              </h6>
            </li>
            <li v-if="usuario?.email">
              <span class="dropdown-item-text small text-body-secondary">
                {{ usuario.email }}
              </span>
            </li>
            <li><hr class="dropdown-divider" /></li>
            <li>
              <button
                type="button"
                class="dropdown-item d-flex align-items-center gap-2"
                @click="selecionarDropdownItem({ rotulo: 'Sair da conta' })"
              >
                <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                Sair da conta
              </button>
            </li>
          </ul>
        </div>
      </template>
    </CabecalhoNavegacao>

    <!--
      Container fluido com sidebar + conteúdo principal.
      Modelo do exemplo dashboard do Bootstrap:
        <div class="container-fluid">
          <div class="row">
            <div class="sidebar col-lg-2">...</div>
            <main class="col-lg-10">...</main>
          </div>
        </div>
    -->
    <div class="container-fluid flex-grow-1 p-0">
      <div class="row g-0">
        <!--
          Sidebar: col-lg-2 no desktop, offcanvas no mobile.
          A variante 'dashboard' usa internamente `offcanvas-lg`
          (offcanvas no mobile, sticky visível no desktop >= lg).
          O mesmo elemento serve para os dois contextos.
          O botão hamburger do CabecalhoNavegacao abre este offcanvas
          via data-bs-target="#barraLateralOffcanvas".
        -->
        <aside class="col-lg-2 sidebar-wrapper" aria-label="Navegação lateral">
          <BarraLateral
            variante="dashboard"
            :itens="itensSidebar"
            v-model="itemAtivo"
            marca="Busca Ativa"
            :nome-usuario="usuario?.nome || ''"
            :itens-dropdown="itensDropdown"
            id-offcanvas="barraLateralOffcanvas"
            @navegar="navegar"
          />
        </aside>

        <!--
          Conteúdo principal. id="conteudoPrincipal" é usado pelo
          botão "Ler Tela" da acessibilidade para limitar a leitura.
        -->
        <main
          id="conteudoPrincipal"
          class="col-12 col-lg-10 px-2 px-md-4 py-3 py-md-4"
          role="main"
          tabindex="-1"
        >
          <router-view />
        </main>
      </div>
    </div>

    <!--
      Rodapé simplificado, apenas informativo.
    -->
    <footer class="bg-body-tertiary border-top py-2 mt-auto">
      <div
        class="container-fluid d-flex flex-wrap justify-content-between align-items-center gap-2 small text-body-secondary"
      >
        <span>
          <i class="bi bi-mortarboard-fill text-primary me-1" aria-hidden="true"></i>
          Busca Ativa Escolar · Combate à evasão escolar
        </span>
        <span>Ambiente restrito à equipe escolar e famílias</span>
      </div>
    </footer>

    <!--
      Offcanvas global de Acessibilidade.
      É aberto pelo botão no CabecalhoNavegacao (variante dashboard).
    -->
    <div
      class="offcanvas offcanvas-end"
      tabindex="-1"
      id="offcanvasAcessibilidade"
      aria-labelledby="offcanvasAcessibilidadeLabel"
    >
      <div class="offcanvas-header">
        <h5 class="offcanvas-title" id="offcanvasAcessibilidadeLabel">
          <i class="bi bi-universal-access me-2" aria-hidden="true"></i>
          Acessibilidade
        </h5>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label="Fechar ferramentas de acessibilidade"
        ></button>
      </div>
      <div class="offcanvas-body">
        <p class="text-body-secondary small mb-3">
          Ferramentas para facilitar a leitura e a navegação na tela.
        </p>
        <div class="d-grid gap-2">
          <button
            class="btn btn-outline-primary text-start"
            aria-label="Ler conteúdo da tela"
            title="Ler conteúdo da tela"
            @click="lerTela"
            data-bs-dismiss="offcanvas"
          >
            <i class="bi bi-volume-up me-2" aria-hidden="true"></i>
            Ler Tela
          </button>
          <button
            class="btn btn-outline-primary text-start"
            aria-label="Alternar alto contraste"
            title="Alternar alto contraste"
            @click="alternarContraste"
            data-bs-dismiss="offcanvas"
          >
            <i class="bi bi-circle-half me-2" aria-hidden="true"></i>
            Alto Contraste
          </button>
          <div class="d-flex gap-2">
            <button
              class="btn btn-outline-primary flex-fill"
              aria-label="Aumentar tamanho da fonte"
              title="Aumentar fonte"
              @click="aumentarFonte"
            >
              <i class="bi bi-plus-circle me-1" aria-hidden="true"></i>
              Aumentar
            </button>
            <button
              class="btn btn-outline-primary flex-fill"
              aria-label="Diminuir tamanho da fonte"
              title="Diminuir fonte"
              @click="diminuirFonte"
            >
              <i class="bi bi-dash-circle me-1" aria-hidden="true"></i>
              Diminuir
            </button>
          </div>
        </div>

        <hr class="my-4" />

        <h6 class="fw-bold mb-2">Sobre as ferramentas</h6>
        <ul class="list-unstyled small text-body-secondary ps-2">
          <li class="mb-1">
            <i class="bi bi-volume-up me-1" aria-hidden="true"></i>
            <strong>Ler Tela:</strong> usa a voz do aparelho para ler o conteúdo visível.
          </li>
          <li class="mb-1">
            <i class="bi bi-circle-half me-1" aria-hidden="true"></i>
            <strong>Alto Contraste:</strong> alterna entre tema claro e escuro.
          </li>
          <li>
            <i class="bi bi-type me-1" aria-hidden="true"></i>
            <strong>Fonte:</strong> aumenta ou diminui o tamanho das letras.
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * Wrapper da sidebar no desktop. A sidebar é col-lg-2 (~16%),
 * inspirada no exemplo dashboard do Bootstrap 5.3.
 *
 * No mobile (< lg) a sidebar vira offcanvas e o aside não ocupa
 * espaço visual (a offcanvas-lg interna usa position: fixed
 * quando ativada).
 */
.sidebar-wrapper {
  background-color: var(--bs-tertiary-bg);
  border-right: 1px solid var(--bs-border-color);
}
</style>
