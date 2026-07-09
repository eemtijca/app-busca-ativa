<script setup lang="ts">
/**
 * LayoutPrincipal.vue - Layout raiz da aplicação.
 *
 * Fornece:
 *   1. Cabeçalho escuro com brand + autenticação (dropdown do usuário)
 *   2. Botão flutuante (FAB) para offcanvas de acessibilidade
 *   3. Offcanvas lateral com TTS, alto contraste e ajuste de fonte
 *   4. Conteúdo principal (<router-view>)
 *   5. Rodapé simplificado
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useAcessibilidade } from '@/composables/useAcessibilidade';
import CabecalhoNavegacao from '@/componentes/CabecalhoNavegacao.vue';
import RodapeSite from '@/componentes/RodapeSite.vue';

const router = useRouter();

const { usuario, logout } = useAutenticacao();
const { lerTexto, alternarContraste, aumentarFonte, diminuirFonte } = useAcessibilidade();

const estaLogado = computed(() => !!usuario.value);

const itensDropdown = computed(() => [{ rotulo: 'Sair', url: '#', dividir: false }]);

const itensNav = computed(() => []);

function lerTela(): void {
  const texto = document.body.innerText;
  lerTexto(texto);
}

async function handleLogout(): Promise<void> {
  await logout();
  await router.push('/');
}
</script>

<template>
  <CabecalhoNavegacao
    variante="escuro"
    :itens="itensNav"
    :marca="'Busca Ativa'"
    :nome-usuario="usuario?.nome || ''"
    :avatar-src="''"
    :itens-dropdown="estaLogado ? itensDropdown : []"
    :rotulo-entrar="''"
    :rotulo-cadastrar="''"
    placeholder-pesquisa=""
  >
    <template #acoes>
      <template v-if="estaLogado">
        <span class="text-white small me-2">
          <i class="bi bi-person-circle" aria-hidden="true"></i>
          <span class="d-none d-md-inline ms-1">{{ usuario!.nome }}</span>
        </span>
        <button
          class="btn btn-outline-light btn-sm"
          aria-label="Sair da conta"
          title="Sair"
          @click="handleLogout"
        >
          <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
          <span class="d-none d-md-inline ms-1">Sair</span>
        </button>
      </template>
    </template>
  </CabecalhoNavegacao>

  <main class="container py-3" role="main">
    <router-view />
  </main>

  <RodapeSite
    variante="centralizado"
    :links="[
      { rotulo: 'Busca Ativa', url: '#' },
      { rotulo: 'Suporte', url: '#' },
      { rotulo: 'Privacidade', url: '#' },
    ]"
    empresa="Busca Ativa Escolar"
  />

  <button
    class="btn btn-primary position-fixed bottom-0 end-0 m-3 rounded-circle shadow d-flex align-items-center justify-content-center"
    style="width: 56px; height: 56px; z-index: 1050"
    type="button"
    data-bs-toggle="offcanvas"
    data-bs-target="#offcanvasAcessibilidade"
    aria-controls="offcanvasAcessibilidade"
    aria-label="Abrir ferramentas de acessibilidade"
    title="Ferramentas de acessibilidade"
  >
    <i class="bi bi-universal-access fs-4" aria-hidden="true"></i>
  </button>

  <div
    class="offcanvas offcanvas-end"
    tabindex="-1"
    id="offcanvasAcessibilidade"
    aria-labelledby="offcanvasLabel"
  >
    <div class="offcanvas-header">
      <h5 class="offcanvas-title" id="offcanvasLabel">
        <i class="bi bi-universal-access me-2" aria-hidden="true"></i>
        Acessibilidade
      </h5>
      <button
        type="button"
        class="btn-close"
        data-bs-dismiss="offcanvas"
        aria-label="Fechar"
      ></button>
    </div>
    <div class="offcanvas-body">
      <p class="text-body-secondary small mb-3">
        Ferramentas para facilitar a leitura e navegação na tela.
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
    </div>
  </div>
</template>
