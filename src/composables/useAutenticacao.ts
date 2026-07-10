import { ref, type Ref } from 'vue';
import { supabaseClient, decodificarToken } from '@/servicos/supabase';
import type { Perfil, PapelUsuario } from '@/tipos/database';

const usuario: Ref<Perfil | null> = ref(null);
const carregando: Ref<boolean> = ref(true);

/**
 * Fallback para tokens emitidos antes do Custom Access Token Hook.
 * Em operacao normal as claims do JWT ja contem nome e papel.
 */
async function carregarPerfil() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session?.user?.id) {
    usuario.value = null;
    return;
  }

  const { data } = await supabaseClient
    .from('perfis')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (data) {
    usuario.value = data as unknown as Perfil;
  }
}

/**
 * Listener global registrado UMA vez no escopo de modulo.
 * Reage a INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED e SIGNED_OUT
 * sem necessidade de onMounted ou polling.
 */
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session?.access_token) {
      const claims = decodificarToken(session.access_token);

      if (claims?.papel && claims?.nome) {
        usuario.value = {
          id: claims.sub,
          nome: claims.nome,
          papel: claims.papel as PapelUsuario,
          email: claims.email ?? null,
          telefone: null,
          created_at: '',
        };
      } else {
        carregarPerfil();
      }
    }
    carregando.value = false;
  } else if (event === 'INITIAL_SESSION') {
    if (session?.access_token) {
      const claims = decodificarToken(session.access_token);
      if (claims?.papel && claims?.nome) {
        usuario.value = {
          id: claims.sub,
          nome: claims.nome,
          papel: claims.papel as PapelUsuario,
          email: claims.email ?? null,
          telefone: null,
          created_at: '',
        };
      }
    }
    carregando.value = false;
  } else if (event === 'SIGNED_OUT') {
    usuario.value = null;
    carregando.value = false;
    supabaseClient.removeAllChannels();
  }
});

export function useAutenticacao() {
  /**
   * Autentica com email/senha. O listener onAuthStateChange
   * preenche usuario.value automaticamente via JWT.
   */
  async function login(email: string, senha: string) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) throw error;

    if (!usuario.value) {
      await carregarPerfil();
    }

    return data;
  }

  /** Encerra a sessao atual (scope: 'local' = nao afeta outras abas). */
  async function logout() {
    supabaseClient.removeAllChannels();
    await supabaseClient.auth.signOut({ scope: 'local' });
    usuario.value = null;
  }

  async function verificarSessao(): Promise<boolean> {
    return !!usuario.value;
  }

  return {
    usuario,
    carregando,
    login,
    logout,
    verificarSessao,
    carregarPerfil,
  };
}
