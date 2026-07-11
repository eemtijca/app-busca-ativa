<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useStatusConexao } from '@/composables/useStatusConexao';
import IndicadorConexao from '@/componentes/IndicadorConexao.vue';
import CabecalhoNavegacao from '@/componentes/CabecalhoNavegacao.vue';

const router = useRouter();

const { usuario, logout } = useAutenticacao();
const { status } = useStatusConexao();
async function handleLogout(): Promise<void> {
  await logout();
  await router.push('/');
}
</script>

<template>
  <div class="d-flex flex-column overflow-hidden" style="height: 100dvh">
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
            <span class="d-inline text-truncate" style="max-width: 140px">
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
        <IndicadorConexao :status="status" />
        <span>v0.1.0</span>
      </div>
    </footer>
  </div>
</template>
