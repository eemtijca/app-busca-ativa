/**
 * useAutenticacao.ts - Composable de autenticação do sistema.
 *
 * FUNÇÃO:
 *   Fornece estado reativo e funções para autenticação via Supabase Auth.
 *   Utiliza um LISTENER GLOBAL (onAuthStateChange) que mantém o estado
 *   sincronizado em TODOS os componentes da aplicação sem necessidade
 *   de consultas ao banco de dados.
 *
 * ARQUITETURA JWT (Custom Claims):
 *   O Custom Access Token Hook (Postgres) injeta as claims 'nome' e
 *   'papel' no JWT no momento da emissão. O listener onAuthStateChange
 *   decodifica o token via jwt-decode, eliminando a necessidade de
 *   consultar a tabela perfis a cada navegação.
 *
 *   Fallback: se o JWT não contiver as claims (tokens emitidos antes
 *   do hook), carregarPerfil() consulta o banco como contingência.
 *
 * FLUXO:
 *   1. App inicia -> listener dispara 'INITIAL_SESSION'
 *   2. Se há sessão salva -> jwtDecode -> usuario.value populado
 *   3. Login -> signInWithPassword -> 'SIGNED_IN' -> jwtDecode
 *   4. Navegação -> guarda lê papel do JWT (0 queries)
 *   5. Logout -> 'SIGNED_OUT' -> usuario.value = null
 *
 * SEGURANÇA:
 *   - Claims lidas do app_metadata (NÃO raw_user_meta_data)
 *   - jwt-decode apenas decodifica, não verifica assinatura
 *     (a verificação é feita pelo Supabase Auth server-side)
 *   - Listener não expõe dados sensíveis
 */

import { ref, type Ref } from 'vue'
import { supabaseClient, decodificarToken } from '@/servicos/supabase'
import type { Perfil, PapelUsuario } from '@/tipos/database'

// ================================================================
// Estado compartilhado - escopo de módulo
// ================================================================

/** Perfil do usuário autenticado (null = não autenticado) */
const usuario: Ref<Perfil | null> = ref(null)

/** Indica se a sessão já foi verificada (true = carregando) */
const carregando: Ref<boolean> = ref(true)

// ================================================================
// Função de fallback - escopo de módulo para uso no listener
// ================================================================

/**
 * carregarPerfil - Busca o perfil do usuário na tabela perfis.
 *
 * Função de FALLBACK para tokens emitidos antes do Custom
 * Access Token Hook estar ativo. Em operação normal, as claims
 * do JWT já contêm nome e papel, eliminando esta query.
 */
async function carregarPerfil() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession()

  if (!session) {
    usuario.value = null
    return
  }

  const { data } = await supabaseClient
    .from('perfis')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (data) {
    usuario.value = data as unknown as Perfil
  }
}

// ================================================================
// Listener global de autenticação
// ================================================================
//
// Registrado UMA ÚNICA VEZ no escopo de módulo. Reage a eventos
// de autenticação do Supabase sem necessidade de onMounted ou
// polling.
//
// Eventos tratados:
//   - INITIAL_SESSION:  dispara ao registrar o listener (sessão atual)
//   - SIGNED_IN:        após login bem-sucedido
//   - TOKEN_REFRESHED:  após refresh automático do token
//   - SIGNED_OUT:       após logout
//

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session?.access_token) {
      // Tenta extrair claims do JWT (via Custom Access Token Hook)
      const claims = decodificarToken(session.access_token)

      if (claims?.papel && claims?.nome) {
        // JWT com claims customizadas - preenche sem consultar banco
        usuario.value = {
          id: claims.sub,
          nome: claims.nome,
          papel: claims.papel as PapelUsuario,
          email: claims.email ?? null,
          telefone: null,
          created_at: '',
        }
      } else {
        // Fallback: token antigo sem claims - consulta banco
        carregarPerfil()
      }
    }
    carregando.value = false
  } else if (event === 'SIGNED_OUT') {
    usuario.value = null
    carregando.value = false
  }
})

// ================================================================
// Funções públicas do composable
// ================================================================

export function useAutenticacao() {
  /**
   * login - Autentica o usuário com email e senha via Supabase Auth.
   *
   * Após autenticar, o listener onAuthStateChange dispara SIGNED_IN
   * e preenche usuario.value automaticamente pelo JWT.
   *
   * @throws Erro do Supabase Auth se as credenciais forem inválidas
   */
  async function login(email: string, senha: string) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) throw error

    // Aguarda um tick para o listener onAuthStateChange preencher usuario
    // Caso o JWT seja antigo (sem claims), chama fallback
    if (!usuario.value) {
      await carregarPerfil()
    }

    return data
  }

  /**
   * logout - Encerra a sessão no Supabase Auth e limpa o perfil.
   * Usa scope: 'local' para encerrar apenas a sessão atual
   * (não afeta outras abas/dispositivos).
   * O listener onAuthStateChange dispara SIGNED_OUT.
   */
  async function logout() {
    await supabaseClient.auth.signOut({ scope: 'local' })
    usuario.value = null
  }

  /**
   * verificarSessao - Verifica se há sessão ativa.
   *
   * Não faz mais query ao banco: o listener onAuthStateChange já
   * manteve usuario.value atualizado. Retorna apenas o estado.
   *
   * @returns true se usuario.value está preenchido
   */
  async function verificarSessao(): Promise<boolean> {
    return !!usuario.value
  }

  return {
    usuario,
    carregando,
    login,
    logout,
    verificarSessao,
    carregarPerfil,
  }
}
