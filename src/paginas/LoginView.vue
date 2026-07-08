<script setup lang="ts">
/**
 * LoginView.vue - Tela de autenticação do sistema Busca Ativa Escolar.
 *
 * PADRÃO VISUAL:
 *   Segue o exemplo oficial do Bootstrap 5 "Sign-in Template"
 *   (https://getbootstrap.com/docs/5.3/examples/sign-in/).
 *   Estrutura: form-signin w-100 m-auto com form-floating inputs,
 *   botão w-100 py-2 e rodapé text-body-secondary.
 *
 * FLUXO:
 *   1. Usuário preenche email + senha e clica em "Entrar".
 *   2. O componente chama login() do composable useAutenticacao.
 *   3. Em caso de erro, a mensagem é traduzida para pt-BR amigável.
 *   4. Em caso de sucesso, lê usuario.value.papel e redireciona via
 *      router.push() para a rota específica do papel.
 *
 * SEGURANÇA (MVP):
 *   - NÃO existe fluxo de cadastro ("Cadastre-se"). A criação de contas
 *     é interna da gestão escolar para evitar cadastros falsos.
 *   - Botão e campos são desabilitados durante o carregamento para
 *     evitar requisições duplicadas.
 *   - Erros são traduzidos para não expor detalhes técnicos.
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAutenticacao } from '@/composables/useAutenticacao'
import { useAcessibilidade } from '@/composables/useAcessibilidade'

// Instância do Vue Router para navegação explícita pós-login
const router = useRouter()

// Composable de autenticação: fornece login(), usuario (reativo) e logout()
const { usuario, login } = useAutenticacao()

// Composable de acessibilidade: usado para ler mensagens de erro em voz alta (TTS)
const { lerTexto } = useAcessibilidade()

// ---- Estado reativo do formulário ----

/** Email digitado pelo usuário */
const email = ref('')

/** Senha digitada pelo usuário */
const senha = ref('')

/** Controla o estado de carregamento durante a requisição ao Supabase */
const carregando = ref(false)

/** Mensagem de erro amigável exibida no alerta (null = sem erro) */
const erro = ref<string | null>(null)

/**
 * Mapeamento de papéis para rotas absolutas.
 * Usado no redirecionamento explícito após login bem-sucedido.
 */
const homePorPapel: Record<string, string> = {
  professor: '/professor',
  gestao: '/gestao',
  responsavel: '/responsavel',
}

/**
 * traduzirErro - Converte erros retornados pelo Supabase Auth
 * (originalmente em inglês) para mensagens amigáveis em pt-BR.
 *
 * Regra de segurança: nunca expor detalhes técnicos do erro original
 * ao usuário final.
 *
 * @param erroDesconhecido - O erro capturado no catch (pode ser
 *                           um objeto Error, string ou qualquer tipo).
 * @returns Mensagem traduzida para exibição no alerta.
 */
function traduzirErro(erroDesconhecido: unknown): string {
  // Extrai a mensagem textual do erro, independente do formato
  const mensagemOriginal =
    erroDesconhecido instanceof Error ? erroDesconhecido.message : String(erroDesconhecido)

  // Mapeamento de padrões conhecidos do Supabase Auth para pt-BR
  if (mensagemOriginal.includes('Invalid login credentials')) {
    return 'Email ou senha incorretos.'
  }

  if (mensagemOriginal.includes('Email not confirmed')) {
    return 'Email ainda não confirmado. Verifique sua caixa de entrada.'
  }

  if (mensagemOriginal.includes('Too many requests')) {
    return 'Muitas tentativas seguidas. Aguarde um momento e tente novamente.'
  }

  if (mensagemOriginal.includes('Auth session missing')) {
    return 'Sessão expirada. Faça login novamente.'
  }

  // Erros de rede (ex: servidor offline, CORS, timeout)
  if (
    mensagemOriginal.includes('NetworkError') ||
    mensagemOriginal.includes('TypeError') ||
    mensagemOriginal.includes('Failed to fetch')
  ) {
    return 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.'
  }

  // Qualquer erro não mapeado: mensagem genérica
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

/**
 * handleLogin - Função principal chamada ao submeter o formulário.
 *
 * Etapas:
 *   1. Valida se email e senha foram preenchidos.
 *   2. Ativa estado de carregamento (desabilita botão e campos).
 *   3. Chama login() do useAutenticacao (que internamente chama
 *      signInWithPassword + carregarPerfil do Supabase).
 *   4. Se erro: traduz e armazena em erro.value para exibição.
 *   5. Se sucesso: lê usuario.value.papel e redireciona explicitamente
 *      com router.push() para a rota do papel.
 *   6. Finaliza estado de carregamento (finally).
 */
async function handleLogin(): Promise<void> {
  // ---- Validação local (evita requisição desnecessária) ----

  if (!email.value.trim() || !senha.value.trim()) {
    erro.value = 'Preencha o email e a senha para continuar.'
    return
  }

  // ---- Início da requisição ----

  carregando.value = true
  erro.value = null

  try {
    await login(email.value.trim(), senha.value)

    // Após login bem-sucedido, o perfil do usuário foi carregado
    // em usuario.value (vide carregarPerfil dentro do composable).
    const papel = usuario.value?.papel

    if (papel && homePorPapel[papel]) {
      // Redirecionamento EXPLÍCITO baseado no papel do usuário
      await router.push(homePorPapel[papel])
    } else {
      // Caso o perfil não tenha papel definido (fallback de segurança)
      erro.value = 'Perfil não identificado. Contate a gestão escolar.'
    }
  } catch (erroDesconhecido: unknown) {
    // Traduz o erro técnico para mensagem amigável ao usuário
    erro.value = traduzirErro(erroDesconhecido)

    // Aciona o TTS (leitura da tela) para acessibilidade
    lerTexto(erro.value)
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <!--
    Padrão Bootstrap Sign-in Template.
    https://getbootstrap.com/docs/5.3/examples/sign-in/

    Usa <div> em vez de <main> para evitar <main> aninhado
    (o LayoutPrincipal já fornece o <main> semântico).

    bg-body-tertiary dá o fundo cinza claro do exemplo.
    d-flex + align-items-center + py-4 centraliza verticalmente.
  -->
  <div class="d-flex align-items-center py-4 bg-body-tertiary" style="min-height: 100vh">
    <!--
      form-signin: wrapper com max-width 330px centralizado.
      w-100: garante largura total dentro do espaço disponível.
      m-auto: centraliza horizontalmente.
    -->
    <div class="form-signin w-100 m-auto">
      <form @submit.prevent="handleLogin" novalidate>
        <!--
          Logo / Identidade visual.
          Estrutura equivalente ao <img class="mb-4" width="72" height="57">
          do template oficial. Ícone do Bootstrap Icons utilizado como
          logotipo substituto para evitar dependência de assets externos.
        -->
        <div class="text-center mb-4">
          <i
            class="bi bi-mortarboard-fill"
            style="font-size: 3rem; color: var(--bs-primary)"
            aria-hidden="true"
          ></i>
        </div>

        <!--
          Título: h1.h3.mb-3.fw-normal (padrão do exemplo Bootstrap).
          "fw-normal" em vez de "fw-bold" para seguir o exemplo fielmente.
        -->
        <h1 class="h3 mb-3 fw-normal text-center">Entrar</h1>

        <!--
          Alerta de erro amigável.
          Adição ao exemplo Bootstrap: necessário para feedback visual
          quando as credenciais são inválidas. role="alert" garante
          anúncio por leitores de tela (acessibilidade).
        -->
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

        <!--
          Campo de email: form-floating com empilhamento visual.
          O CSS de .form-signin remove o border-radius inferior deste
          input para que ele se "una" visualmente ao input de senha.
        -->
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
          <label for="email">Email</label>
        </div>

        <!--
          Campo de senha: form-floating com empilhamento visual.
          O CSS de .form-signin remove o border-radius superior deste
          input para continuidade visual com o campo de email.
        -->
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

        <!--
          Botão de submit:
          - Largura total (w-100) para facilitar toque em mobile.
          - py-2 para padding vertical generoso (padrão do exemplo).
          - Desabilitado durante carregando para evitar duplo clique.
          - Exibe spinner animado e texto "Entrando..." quando ativo.
        -->
        <button type="submit" class="btn btn-primary w-100 py-2" :disabled="carregando">
          <span
            v-if="carregando"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>

        <!--
          Rodapé informativo.
          Segue o padrão do exemplo: p.mt-5.mb-3.text-body-secondary.
          NÃO contém link de cadastro - a criação de contas é
          processo interno da gestão escolar (regra de segurança do MVP).
        -->
        <p class="mt-5 mb-3 text-body-secondary text-center">Ambiente restrito à equipe escolar</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
/**
 * CSS do Bootstrap Sign-in Template.
 * Fonte: https://getbootstrap.com/docs/5.3/examples/sign-in/sign-in.css
 *
 * .form-signin: wrapper com largura máxima 330px e padding 1rem.
 * Os estilos de input criam o efeito de empilhamento visual
 * entre email e senha, removendo border-radius nas bordas internas.
 */
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
