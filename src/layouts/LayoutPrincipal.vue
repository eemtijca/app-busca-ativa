<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useAcessibilidade } from '@/composables/useAcessibilidade';
import CabecalhoNavegacao from '@/componentes/CabecalhoNavegacao.vue';

const router = useRouter();

const { usuario, logout } = useAutenticacao();
const { lerTexto, alternarContraste, aumentarFonte, diminuirFonte } = useAcessibilidade();

async function handleLogout(): Promise<void> {
  await logout();
  await router.push('/');
}

function lerTela(): void {
  const main = document.getElementById('conteudoPrincipal');
  const texto = main ? main.innerText : document.body.innerText;
  lerTexto(texto);
}
</script>

<template>
  <div class="d-flex flex-column vh-100 overflow-hidden">
    <CabecalhoNavegacao variante="dashboard" :itens="[]" marca="Busca Ativa">
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
                @click="handleLogout"
              >
                <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                Sair da conta
              </button>
            </li>
          </ul>
        </div>
      </template>
    </CabecalhoNavegacao>

    <main id="conteudoPrincipal" class="flex-grow-1 overflow-y-auto" role="main" tabindex="-1">
      <router-view />
    </main>

    <footer class="flex-shrink-0 bg-body-tertiary border-top py-1">
      <div
        class="d-flex flex-wrap justify-content-between align-items-center gap-2 small text-body-secondary px-3"
      >
        <span>
          <i class="bi bi-mortarboard text-primary me-1" aria-hidden="true"></i>
          Busca Ativa Escolar
        </span>
        <span>Ambiente restrito</span>
      </div>
    </footer>

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
            Ler tela
          </button>
          <button
            class="btn btn-outline-primary text-start"
            aria-label="Alternar alto contraste"
            title="Alternar alto contraste"
            @click="alternarContraste"
            data-bs-dismiss="offcanvas"
          >
            <i class="bi bi-circle-half me-2" aria-hidden="true"></i>
            Alto contraste
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
            <strong>Ler tela:</strong> usa a voz do aparelho para ler o conteúdo visível.
          </li>
          <li class="mb-1">
            <i class="bi bi-circle-half me-1" aria-hidden="true"></i>
            <strong>Alto contraste:</strong> alterna entre tema claro e escuro.
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
