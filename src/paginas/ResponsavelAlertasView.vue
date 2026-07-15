<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useMonitoramento } from '@/composables/useMonitoramento';
import { supabaseClient } from '@/servicos/supabase';
import CartaoAlertaResponsavel from '@/componentes/CartaoAlertaResponsavel.vue';
import type { AlertaResponsavel } from '@/tipos/componentes';

const router = useRouter();
const { usuario } = useAutenticacao();
const { buscarAlertasResponsavel } = useMonitoramento();

let canalAlertas: ReturnType<typeof supabaseClient.channel>;

const alertas = ref<AlertaResponsavel[]>([]);

function abrirJustificativa() {
  router.push('/responsavel/justificativa');
}

onMounted(async () => {
  if (usuario.value) {
    alertas.value = await buscarAlertasResponsavel(usuario.value.id);
  }
  canalAlertas = supabaseClient
    .channel('alertas-responsavel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'frequencias' }, () => {
      if (usuario.value)
        buscarAlertasResponsavel(usuario.value.id).then((r) => (alertas.value = r));
    })
    .subscribe();
});

onUnmounted(() => {
  if (canalAlertas) supabaseClient.removeChannel(canalAlertas);
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
        <CartaoAlertaResponsavel :alerta="alerta" @enviar-justificativa="abrirJustificativa" />
      </div>
    </div>
  </div>
</template>
