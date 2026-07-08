<script setup lang="ts">
/**
 * LayoutPrincipal.vue - Layout raiz da aplicação.
 *
 * FUNÇÃO:
 *   Fornece:
 *     1. Navbar minimalista (brand + autenticação)
 *     2. Botão flutuante (FAB) para abrir offcanvas de acessibilidade
 *     3. Offcanvas lateral com ferramentas de acessibilidade:
 *        - Leitura de tela (TTS)
 *        - Alto contraste
 *        - Ajuste de fonte (aumentar/diminuir)
 *     4. Contêiner principal para o <router-view>
 *
 * FLUXO DE AUTENTICAÇÃO:
 *   O estado reativo usuario.value é mantido pelo listener global
 *   onAuthStateChange no composable useAutenticacao, que decodifica
 *   as claims do JWT assim que a sessão é restaurada. Não é
 *   necessário chamar verificarSessao() no onMounted.
 *
 * ACESSIBILIDADE:
 *   As ferramentas ficam em um offcanvas (drawer lateral) acessado
 *   via FAB no canto inferior direito, sempre visível.
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useAcessibilidade } from '@/composables/useAcessibilidade';

const router = useRouter();

const { usuario, logout } = useAutenticacao();

const { lerTexto, alternarContraste, aumentarFonte, diminuirFonte } = useAcessibilidade();

const estaLogado = computed(() => !!usuario.value);

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
  <!--
    Navbar principal - enxuta, apenas brand + autenticação.
    Segue o padrão Bootstrap headers: p-3 text-bg-dark + container.
  -->
  <nav class="p-3 text-bg-dark" role="navigation" aria-label="Barra de navegação principal">
    <div class="container">
      <div class="d-flex flex-wrap align-items-center justify-content-between">
        <!--
          Identidade visual.
          router-link para '/' permite navegar ao login se deslogado,
          ou aciona o guard de rota que redireciona para a dashboard.
        -->
        <router-link to="/" class="d-flex align-items-center text-white text-decoration-none gap-2">
          <i class="bi bi-mortarboard-fill fs-4" aria-hidden="true"></i>
          <span class="fs-5">Busca Ativa</span>
        </router-link>

        <!--
          Autenticação: exibido apenas quando o usuário está logado.
          Em telas pequenas, apenas o ícone do usuário e o botão "Sair"
          aparecem; o texto é revelado em md+.
        -->
        <template v-if="estaLogado">
          <div class="d-flex align-items-center gap-2">
            <span class="text-white small">
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
          </div>
        </template>

        <!--
          Botão "Entrar" omitido intencionalmente.
          A rota raiz (/) já exibe o formulário de login via
          <router-view>. Incluir um botão de login redundante na
          navbar adicionaria complexidade visual desnecessária.
        -->
      </div>
    </div>
  </nav>

  <!--
    Área de conteúdo principal.
    container em vez de container-fluid para alinhamento consistente
    com os padrões dos exemplos do Bootstrap.
  -->
  <main class="container py-3" role="main">
    <router-view />
  </main>

  <!--
    Botão Flutuante (FAB) - Acessibilidade.
    Position-fixed no canto inferior direito, sempre visível.
    Abre o offcanvas com as ferramentas de acessibilidade.
  -->
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

  <!--
    Offcanvas - Drawer lateral de acessibilidade.
    Abre da direita (offcanvas-end). Contém:
    - TTS (Ler Tela)
    - Alto Contraste
    - Ajuste de Fonte (Aumentar / Diminuir)
  -->
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
        <!--
          Ler Tela - Aciona TTS.
          data-bs-dismiss="offcanvas" fecha o drawer após o clique.
        -->
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

        <!--
          Alto Contraste - Alterna entre tema claro/escuro.
        -->
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

        <!--
          Ajuste de Fonte: dois botões lado a lado.
        -->
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
