import { ref, type Ref } from 'vue';

export type StatusConexao = 'conectado' | 'desconectado';

export function useRealtimeRefresh() {
  const ultimaAtualizacao: Ref<Date | null> = ref(null);
  const estaAtualizando: Ref<boolean> = ref(false);
  const statusConexao: Ref<StatusConexao> = ref('desconectado');

  function marcarConectado() {
    statusConexao.value = 'conectado';
  }

  function marcarDesconectado() {
    statusConexao.value = 'desconectado';
  }

  function aoConectar(fn: () => Promise<void>) {
    return async (status: string) => {
      if (status === 'SUBSCRIBED') {
        statusConexao.value = 'conectado';
        await fn();
        ultimaAtualizacao.value = new Date();
      } else {
        statusConexao.value = 'desconectado';
      }
    };
  }

  async function atualizar(fn: () => Promise<void>) {
    estaAtualizando.value = true;
    try {
      await fn();
      ultimaAtualizacao.value = new Date();
    } finally {
      estaAtualizando.value = false;
    }
  }

  return {
    ultimaAtualizacao,
    estaAtualizando,
    statusConexao,
    aoConectar,
    atualizar,
    marcarConectado,
    marcarDesconectado,
  };
}
