<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useStatusConexao } from '@/composables/useStatusConexao';
import IndicadorConexao from '@/componentes/IndicadorConexao.vue';
import { armazenamento } from '@/servicos/supabase';

const router = useRouter();
const { usuario, login } = useAutenticacao();
const { status } = useStatusConexao();

const email = ref('');
const senha = ref('');
const lembrar = ref(false);
const carregando = ref(false);
const erro = ref<string | null>(null);

const homePorPapel: Record<string, string> = {
  professor: '/professor',
  gestao: '/gestao',
  responsavel: '/responsavel',
};

function traduzirErro(erroDesconhecido: unknown): string {
  const mensagemOriginal =
    erroDesconhecido instanceof Error ? erroDesconhecido.message : String(erroDesconhecido);

  if (mensagemOriginal.includes('Invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }

  if (mensagemOriginal.includes('Email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  }

  if (mensagemOriginal.includes('Too many requests')) {
    return 'Muitas tentativas seguidas. Aguarde um momento e tente novamente.';
  }

  if (mensagemOriginal.includes('Auth session missing')) {
    return 'Sessão expirada. Faça login novamente.';
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

async function handleLogin(): Promise<void> {
  if (!email.value.trim() || !senha.value.trim()) {
    erro.value = 'Preencha o email e a senha para continuar.';
    return;
  }

  carregando.value = true;
  erro.value = null;

  armazenamento.definirLembrar(lembrar.value);

  try {
    await login(email.value.trim(), senha.value);

    // Após login bem-sucedido, o perfil do usuário foi carregado
    // em usuario.value (vide carregarPerfil dentro do composable).
    const papel = usuario.value?.papel;

    if (papel && homePorPapel[papel]) {
      // Redirecionamento EXPLÍCITO baseado no papel do usuário
      await router.push(homePorPapel[papel]);
    } else {
      // Caso o perfil não tenha papel definido (fallback de segurança)
      erro.value = 'Perfil não identificado. Contate a gestão escolar.';
    }
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
      <form @submit.prevent="handleLogin" novalidate>
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

        <h1 class="h4 mb-3 fw-normal text-center">Entrar</h1>

        <div v-if="erro" class="alert alert-danger d-flex align-items-center" role="alert">
          <svg
            class="bi flex-shrink-0 me-2"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-label="Erro:"
          >
            <path
              d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
            />
          </svg>
          <span>{{ erro }}</span>
        </div>

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

        <div class="form-floating">
          <input
            id="senha"
            v-model="senha"
            type="password"
            class="form-control"
            :class="{ 'is-invalid': erro && !senha.trim() }"
            placeholder="Senha"
            :disabled="carregando"
            autocomplete="current-password"
            required
          />
          <label for="senha">Senha</label>
        </div>

        <div class="form-check text-start mb-3">
          <input id="lembrar" v-model="lembrar" type="checkbox" class="form-check-input" />
          <label class="form-check-label" for="lembrar">Manter-me conectado(a)</label>
        </div>

        <button type="submit" class="btn btn-primary w-100 py-2" :disabled="carregando">
          <span
            v-if="carregando"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>

        <p class="mt-5 mb-1 text-body-secondary text-center" style="font-size: 0.75rem">v0.1.0</p>
        <div class="d-flex justify-content-center mb-3">
          <IndicadorConexao :status="status" />
        </div>
      </form>
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

.form-signin input[type='email'] {
  margin-bottom: -1px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.form-signin input[type='password'] {
  margin-bottom: 10px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
</style>
