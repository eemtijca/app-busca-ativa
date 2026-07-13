<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { supabaseClient } from '@/servicos/supabase';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { traduzirErro } from '@/utils/traduzirErro';

const { atualizarSenha } = useAutenticacao();

const recoveryFlow = ref(false);
const senha = ref('');
const confirmarSenha = ref('');
const mostrarSenha = ref(false);
const mostrarConfirmacao = ref(false);
const carregando = ref(false);
const atualizado = ref(false);
const erro = ref<string | null>(null);
const erroLink = ref<string | null>(null);

interface Requisito {
  chave: string;
  label: string;
  regex: RegExp;
}

const requisitos: Requisito[] = [
  { chave: 'minimo', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
  { chave: 'maiuscula', label: 'Pelo menos 1 letra maiúscula', regex: /[A-Z]/ },
  { chave: 'minuscula', label: 'Pelo menos 1 letra minúscula', regex: /[a-z]/ },
  { chave: 'numero', label: 'Pelo menos 1 número', regex: /\d/ },
  { chave: 'especial', label: 'Pelo menos 1 caractere especial', regex: /[^A-Za-z0-9]/ },
];

const senhasConferem = computed(
  () => confirmarSenha.value.length > 0 && senha.value === confirmarSenha.value,
);

const senhasDiferem = computed(
  () => confirmarSenha.value.length > 0 && senha.value !== confirmarSenha.value,
);

const formularioValido = computed(
  () =>
    requisitos.every((r) => r.regex.test(senha.value)) &&
    senha.value === confirmarSenha.value &&
    confirmarSenha.value.length > 0,
);

function traduzirErroLink(codigo: string | null): string {
  if (codigo === 'otp_expired') {
    return 'Este link de recuperação expirou. Solicite um novo link para redefinir sua senha.';
  }
  return 'Link de recuperação inválido ou já utilizado. Solicite um novo link.';
}

let subscription: { unsubscribe: () => void } | null = null;
let timeoutId: ReturnType<typeof setTimeout>;

onMounted(() => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, '?'));

  if (hashParams.get('error')) {
    erroLink.value = traduzirErroLink(hashParams.get('error_code'));
    return;
  }

  timeoutId = setTimeout(() => {
    if (!recoveryFlow.value) {
      erroLink.value = 'Link de recuperação inválido ou já utilizado. Solicite um novo link.';
    }
  }, 10000);

  const { data } = supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryFlow.value = true;
      clearTimeout(timeoutId);
    }
  });
  subscription = data.subscription;
});

onUnmounted(() => {
  clearTimeout(timeoutId);
  subscription?.unsubscribe();
});

async function handleAtualizarSenha(): Promise<void> {
  if (!formularioValido.value) return;

  carregando.value = true;
  erro.value = null;

  try {
    await atualizarSenha(senha.value);
    atualizado.value = true;
  } catch (erroDesconhecido: unknown) {
    erro.value = traduzirErro(erroDesconhecido).mensagem;
  } finally {
    carregando.value = false;
  }
}

function requisitoAtendido(req: Requisito): boolean {
  return req.regex.test(senha.value);
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

      <template v-if="erroLink">
        <div class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2 fs-5" aria-hidden="true"></i>
          <span>{{ erroLink }}</span>
        </div>

        <router-link to="/solicitar-recuperacao" class="btn btn-primary w-100 py-2">
          Solicitar novo link
        </router-link>

        <router-link
          to="/"
          class="d-block text-center mt-2 small link-offset-2"
          style="text-decoration: none"
        >
          <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
          Voltar para o login
        </router-link>
      </template>

      <template v-if="!recoveryFlow && !atualizado && !erroLink">
        <div class="alert alert-info d-flex align-items-center" role="alert">
          <i class="bi bi-hourglass-split flex-shrink-0 me-2" aria-hidden="true"></i>
          <span>Verificando link de recuperação...</span>
        </div>
      </template>

      <template v-if="atualizado">
        <div class="alert alert-success d-flex align-items-center" role="alert">
          <i class="bi bi-check-circle-fill flex-shrink-0 me-2 fs-5" aria-hidden="true"></i>
          <span>Senha redefinida com sucesso!</span>
        </div>

        <router-link to="/" class="btn btn-primary w-100 py-2"> Ir para o login </router-link>
      </template>

      <template v-if="recoveryFlow && !atualizado">
        <h1 class="h4 mb-3 fw-normal text-center">Redefinir sua senha</h1>

        <p class="text-body-secondary text-center mb-4" style="font-size: 0.875rem">
          Escolha uma senha forte para sua conta.
        </p>

        <div v-if="erro" class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" aria-hidden="true"></i>
          <span>{{ erro }}</span>
        </div>

        <form @submit.prevent="handleAtualizarSenha" novalidate>
          <div class="form-floating position-relative">
            <input
              id="nova-senha"
              v-model="senha"
              :type="mostrarSenha ? 'text' : 'password'"
              class="form-control pe-5"
              :class="{ 'is-invalid': erro && !senha.trim() }"
              placeholder="Nova senha"
              :disabled="carregando"
              autocomplete="new-password"
              required
            />
            <label for="nova-senha">Nova senha</label>
            <button
              type="button"
              class="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none p-1 pe-2"
              style="z-index: 5"
              @click="mostrarSenha = !mostrarSenha"
              :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'"
              :aria-controls="'nova-senha'"
              tabindex="-1"
            >
              <i :class="mostrarSenha ? 'bi-eye-slash' : 'bi-eye'" class="fs-5 lh-1"></i>
            </button>
          </div>

          <ul
            v-if="senha.length > 0"
            class="list-unstyled mb-0 small mt-2"
            style="font-size: 0.8rem"
            aria-label="Requisitos de senha"
          >
            <li
              v-for="req in requisitos"
              :key="req.chave"
              :class="requisitoAtendido(req) ? 'text-success' : 'text-body-tertiary'"
            >
              <i
                :class="requisitoAtendido(req) ? 'bi-check-circle-fill' : 'bi-circle'"
                class="me-1"
                aria-hidden="true"
              ></i>
              {{ req.label }}
            </li>
          </ul>

          <div class="form-floating position-relative mt-3">
            <input
              id="confirmar-senha"
              v-model="confirmarSenha"
              :type="mostrarConfirmacao ? 'text' : 'password'"
              class="form-control pe-5"
              :class="{
                'is-valid': senhasConferem,
                'is-invalid': senhasDiferem,
              }"
              placeholder="Confirmar senha"
              :disabled="carregando"
              autocomplete="new-password"
              required
            />
            <label for="confirmar-senha">Confirmar senha</label>
            <button
              type="button"
              class="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none p-1 pe-2"
              style="z-index: 5"
              @click="mostrarConfirmacao = !mostrarConfirmacao"
              :aria-label="mostrarConfirmacao ? 'Ocultar senha' : 'Mostrar senha'"
              :aria-controls="'confirmar-senha'"
              tabindex="-1"
            >
              <i :class="mostrarConfirmacao ? 'bi-eye-slash' : 'bi-eye'" class="fs-5 lh-1"></i>
            </button>
          </div>

          <div
            v-if="senhasConferem"
            class="text-success small d-flex align-items-center gap-1 mt-1"
          >
            <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
            Senhas conferem
          </div>
          <div
            v-else-if="senhasDiferem"
            class="text-danger small d-flex align-items-center gap-1 mt-1"
          >
            <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
            Senhas não conferem
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100 py-2 mt-3"
            :disabled="carregando || !formularioValido"
          >
            <span
              v-if="carregando"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            {{ carregando ? 'Redefinindo...' : 'Redefinir senha' }}
          </button>
        </form>
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
