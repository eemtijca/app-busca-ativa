<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useBuscaAtiva } from '@/composables/useBuscaAtiva';
import { supabaseClient } from '@/servicos/supabase';
import CartaoAlertaResponsavel from '@/componentes/CartaoAlertaResponsavel.vue';
import ModalBase from '@/componentes/ModalBase.vue';
import type { AlertaResponsavel } from '@/tipos/componentes';

const router = useRouter();
const { usuario } = useAutenticacao();
const { buscarAlertasResponsavel } = useBuscaAtiva();

const alertas = ref<AlertaResponsavel[]>([]);
const modalAlertaAberto = ref(false);
const alertaSelecionado = ref<AlertaResponsavel | null>(null);

function verDetalhesAlerta(alertaId: string) {
  const a = alertas.value.find((x) => x.id === alertaId);
  if (a) {
    alertaSelecionado.value = a;
    modalAlertaAberto.value = true;
  }
}

function abrirModalJustificativa(alertaId?: string) {
  if (alertaId) {
    const a = alertas.value.find((x) => x.id === alertaId);
    if (a) {
    }
  }
  router.push('/responsavel/justificativa');
}

onMounted(async () => {
  if (usuario.value) {
    alertas.value = await buscarAlertasResponsavel(usuario.value.id);
  }
  supabaseClient
    .channel('alertas-responsavel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'frequencias' }, () => {
      if (usuario.value)
        buscarAlertasResponsavel(usuario.value.id).then((r) => (alertas.value = r));
    })
    .subscribe();
});
</script>

<template>
  <div class="container py-4" style="max-width: 800px">
    <button type="button" class="btn btn-sm btn-outline-secondary mb-3" @click="router.back()">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
      Voltar
    </button>

    <h1 class="h5 fw-bold mb-3">
      <i class="bi bi-bell text-danger me-2" aria-hidden="true"></i>
      Alertas de ausência
    </h1>

    <div v-if="!alertas.length" class="text-center py-5 text-body-secondary">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle mb-3"
        style="width: 72px; height: 72px"
      >
        <i class="bi bi-check-circle fs-4 text-success" aria-hidden="true"></i>
      </span>
      <p class="mb-0 small">Nenhum alerta no momento. Seu filho está com frequência regular.</p>
    </div>

    <div v-else class="row g-3">
      <div v-for="alerta in alertas" :key="alerta.id" class="col-12 col-md-6">
        <CartaoAlertaResponsavel
          :alerta="alerta"
          @ver-detalhes="verDetalhesAlerta"
          @enviar-justificativa="abrirModalJustificativa"
        />
      </div>
    </div>

    <ModalBase
      v-model="modalAlertaAberto"
      variante="padrao"
      tamanho="md"
      titulo="Detalhes do alerta"
      fechar-label="Fechar"
    >
      <div v-if="alertaSelecionado">
        <h3 class="h5 mb-2">{{ alertaSelecionado.titulo }}</h3>
        <p class="text-body-secondary small mb-3">
          <i class="bi bi-calendar me-1" aria-hidden="true"></i>{{ alertaSelecionado.data }}
          <span v-if="alertaSelecionado.periodo">
            · <i class="bi bi-clock me-1" aria-hidden="true"></i
            >{{ alertaSelecionado.periodo }}</span
          >
        </p>
        <p>{{ alertaSelecionado.descricao }}</p>
      </div>
    </ModalBase>
  </div>
</template>
