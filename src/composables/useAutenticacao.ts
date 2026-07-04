import { ref, type Ref } from 'vue'
import { supabaseClient } from '@/servicos/supabase'
import type { Perfil } from '@/tipos/database'

export function useAutenticacao() {
  const usuario: Ref<Perfil | null> = ref(null)
  const carregando: Ref<boolean> = ref(true)

  async function login(email: string, senha: string) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) throw error

    await carregarPerfil()

    return data
  }

  async function logout() {
    await supabaseClient.auth.signOut()
    usuario.value = null
  }

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

  async function verificarSessao(): Promise<boolean> {
    carregando.value = true

    const {
      data: { session },
    } = await supabaseClient.auth.getSession()

    if (session) {
      await carregarPerfil()
    }

    carregando.value = false

    return !!session
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
