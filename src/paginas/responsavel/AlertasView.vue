<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useMonitoramento } from '@/composables/useMonitoramento';
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh';
import { supabaseClient } from '@/servicos/supabase';
import CartaoAlertaResponsavel from '@/componentes/CartaoAlertaResponsavel.vue';
import type { AlertaResponsavel } from '@/tipos/componentes';

const router = useRouter();
const { usuario } = useAutenticacao();
const { buscarAlertasResponsavel } = useMonitoramento();
const { ultimaAtualizacao, estaAtualizando, statusConexao, aoConectar, atualizar: refresh } = useRealtimeRefresh();

let canalAlertas: ReturnType<typeof supabaseClient.channel>;

const alertas = ref<AlertaResponsavel[]>([]);

function abrirJustificativa() {
  router.push('/responsavel/justificativa');
}

async function carregarAlertas() {
  if (usuario.value) {
    alertas.value = await buscarAlertasResponsavel(usuario.value.id);
  }
}

async function atualizarManual() {
  await refresh(carregarAlertas);
}

onMounted(async () => {
  await carregarAlertas();
  canalAlertas = supabaseClient
    .channel('alertas-responsavel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'frequencias' }, () => {
      if (usuario.value)
        buscarAlertasResponsavel(usuario.value.id).then((r) => (alertas.value = r));
    })
    .subscribe(aoConectar(carregarAlertas));
});

onUnmounted(() => {
  if (canalAlertas) supabaseClient.removeChannel(canalAlertas);
});
</script>

<template>
  <div class="container py-4" style="max-width: 800px">
    <div class="d-flex gap-2 mb-3">
      <router-link to="/responsavel" class="btn btn-sm btn-outline-success">
        <i class="bi bi-house me-1" aria-hidden="true"></i>
        Início
      </router-link>
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="router.back()">
        <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
        Voltar
      </button>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h5 fw-bold mb-0">
        <i class="bi bi-bell text-danger me-2" aria-hidden="true"></i>
        Alertas de ausência
      </h1>
      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="estaAtualizando"
          @click="atualizarManual"
          title="Recarregar dados"
        >
          <span
            v-if="estaAtualizando"
            class="spinner-border spinner-border-sm me-1"
            role="status"
            aria-hidden="true"
          ></span>
          <i v-else class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
          Atualizar
        </button>
        <span
          class="rounded-circle d-inline-block"
          :class="statusConexao === 'conectado' ? 'bg-success' : 'bg-danger'"
          style="width: 8px; height: 8px"
          :title="statusConexao === 'conectado' ? 'Conectado' : 'Desconectado'"
        ></span>
      </div>
    </div>

    <div v-if="ultimaAtualizacao" class="small text-body-tertiary mb-2 text-end">
      <i class="bi bi-clock me-1" aria-hidden="true"></i>
      Última atualização: {{ ultimaAtualizacao.toLocaleTimeString('pt-BR') }}
    </div>

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
        <CartaoAlertaResponsavel :alerta="alerta" @enviar-justificativa="abrirJustificativa" />
      </div>
    </div>
  </div>
</template>
