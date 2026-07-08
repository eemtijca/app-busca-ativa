/**
 * supabase.ts - Cliente Supabase e utilitários JWT.
 *
 * FUNÇÃO:
 *   Inicializa o cliente Supabase com as credenciais do ambiente
 *   e fornece funções utilitárias para decodificação de tokens JWT.
 *
 * UTILITÁRIO JWT:
 *   decodificarToken() usa jwt-decode para ler as claims do token
 *   sem precisar consultar o banco de dados. As claims 'nome' e
 *   'papel' são injetadas via Custom Access Token Hook (Postgres).
 *
 * SEGURANÇA:
 *   - A chave publishable key é segura para uso no frontend
 *   - O JWT é armazenado automaticamente pelo Supabase Client
 *   - As claims no token são imutáveis pelo usuário
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { jwtDecode } from 'jwt-decode'

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabasePublishableKey: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não definidas. O cliente não será inicializado.',
  )
}

export const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey)

/**
 * Interface para as claims customizadas do JWT.
 * O Custom Access Token Hook injeta 'nome' e 'papel' no app_metadata.
 */
interface TokenClaims {
  sub: string
  email: string
  nome: string
  papel: string
  [key: string]: unknown
}

/**
 * decodificarToken - Decodifica um JWT e extrai suas claims.
 *
 * Diferente de getSession() que lê do localStorage, esta função
 * decodifica o token sem latência de rede ou banco de dados.
 * Utilizada pelo router guard e pelo composable de autenticação.
 *
 * @param accessToken - O JWT (access_token) da sessão ativa
 * @returns Objeto com as claims ou null se o token for inválido
 */
export function decodificarToken(accessToken: string): TokenClaims | null {
  try {
    const claims = jwtDecode<TokenClaims>(accessToken)
    return claims
  } catch {
    return null
  }
}
