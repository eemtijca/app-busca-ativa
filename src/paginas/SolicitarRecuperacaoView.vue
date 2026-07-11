<script setup lang="ts">
import { ref } from 'vue';
import { useAutenticacao } from '@/composables/useAutenticacao';

const { recuperarSenha } = useAutenticacao();

const email = ref('');
const carregando = ref(false);
const enviado = ref(false);
const erro = ref<string | null>(null);

function traduzirErro(erroDesconhecido: unknown): string {
  const mensagemOriginal =
    erroDesconhecido instanceof Error ? erroDesconhecido.message : String(erroDesconhecido);

  if (mensagemOriginal.includes('Too many requests')) {
    return 'Muitas tentativas seguidas. Aguarde um momento e tente novamente.';
  }

  if (
    mensagemOriginal.includes('NetworkError') ||
    mensagemOriginal.includes('TypeError') ||
    mensagemOriginal.includes('Failed to fetch')
  ) {
    return 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}

async function handleSolicitarRecuperacao(): Promise<void> {
  if (!email.value.trim()) {
    erro.value = 'Informe seu e-mail para recuperar a senha.';
    return;
  }

  carregando.value = true;
  erro.value = null;

  try {
    await recuperarSenha(email.value.trim());
    enviado.value = true;
  } catch (erroDesconhecido: unknown) {
    erro.value = traduzirErro(erroDesconhecido);
  } finally {
    carregando.value = false;
  }
}
</script>

<template>
  <div class="d-flex align-items-center py-4 bg-body-tertiary" style="min-height: 100dvh">
    <div class="form-signin w-100 m-auto">
      <div class="d-flex align-items-center justify-content-center gap-2 mb-5">
        <i
          class="bi bi-mortarboard"
          style="font-size: 2.5rem; color: var(--bs-primary)"
          aria-hidden="true"
        ></i>
        <span class="fw-semibold text-body-secondary" style="font-size: 1.75rem">
          Busca Ativa
        </span>
      </div>

      <template v-if="enviado">
        <div class="alert alert-success d-flex align-items-center" role="alert">
          <i class="bi bi-check-circle-fill flex-shrink-0 me-2 fs-5" aria-hidden="true"></i>
          <span>
            Se este e-mail estiver cadastrado, você receberá um link de recuperação em
            <strong>{{ email }}</strong
            >.
          </span>
        </div>

        <router-link to="/" class="btn btn-outline-primary w-100 py-2">
          Voltar para o login
        </router-link>
      </template>

      <template v-else>
        <h1 class="h4 mb-3 fw-normal text-center">Recuperar senha</h1>

        <p class="text-body-secondary text-center mb-4" style="font-size: 0.875rem">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        <div v-if="erro" class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" aria-hidden="true"></i>
          <span>{{ erro }}</span>
        </div>

        <form @submit.prevent="handleSolicitarRecuperacao" novalidate>
          <div class="form-floating">
            <input
              id="email"
              v-model="email"
              type="email"
              class="form-control"
              :class="{ 'is-invalid': erro && !email.trim() }"
              placeholder="nome@exemplo.com"
              :disabled="carregando"
              autocomplete="email"
              required
            />
            <label for="email">E-mail</label>
          </div>

          <button type="submit" class="btn btn-primary w-100 py-2 mt-3" :disabled="carregando">
            <span
              v-if="carregando"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            {{ carregando ? 'Enviando...' : 'Enviar link de recuperação' }}
          </button>
        </form>

        <router-link
          to="/"
          class="d-block text-center mt-3 small link-offset-2"
          style="text-decoration: none"
        >
          <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
          Voltar para o login
        </router-link>
      </template>

      <p class="mt-5 mb-1 text-body-secondary text-center" style="font-size: 0.75rem">v0.1.0</p>
    </div>
  </div>
</template>

<style scoped>
.form-signin {
  max-width: 330px;
  padding: 1rem;
}

.form-signin .form-floating:focus-within {
  z-index: 2;
}
</style>
