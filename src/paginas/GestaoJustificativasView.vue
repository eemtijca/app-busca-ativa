<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMonitoramento } from '@/composables/useMonitoramento';
import { supabaseClient } from '@/servicos/supabase';
import FilaJustificativas from '@/componentes/FilaJustificativas.vue';
import type { JustificativaPendente } from '@/tipos/componentes';

const router = useRouter();
const { buscarJustificativasPendentes, validarJustificativa } = useMonitoramento();

let canalJustificativas: ReturnType<typeof supabaseClient.channel>;

const justificativas = ref<JustificativaPendente[]>([]);
const mensagemSucesso = ref<string | null>(null);
const mensagemErro = ref<string | null>(null);

function mostrarSucesso(msg: string) {
  mensagemSucesso.value = msg;
  setTimeout(() => (mensagemSucesso.value = null), 4000);
}

function mostrarErro(msg: string) {
  mensagemErro.value = msg;
  setTimeout(() => (mensagemErro.value = null), 4000);
}

const justificativasPendentes = computed(() =>
  justificativas.value.filter((j) => j.status === 'pendente'),
);

function verAnexoJustificativa(justId: string) {
  const j = justificativas.value.find((x) => x.id === justId);
  if (j?.anexoUrl) {
    window.open(j.anexoUrl, '_blank', 'noopener');
  } else {
    mostrarErro('Anexo não disponível.');
  }
}

async function aceitarJustificativa(justId: string) {
  const ok = await validarJustificativa(justId, 'aceitar');
  if (ok) {
    const j = justificativas.value.find((x) => x.id === justId);
    if (j) {
      j.status = 'aceita';
      j.motivo = '[ACEITA] ' + j.motivo;
    }
    mostrarSucesso('Justificativa aceita.');
  } else {
    mostrarErro('Falha ao aceitar justificativa.');
  }
}

async function recusarJustificativa(justId: string) {
  const ok = await validarJustificativa(justId, 'recusar');
  if (ok) {
    const j = justificativas.value.find((x) => x.id === justId);
    if (j) {
      j.status = 'recusada';
      j.motivo = '[RECUSADA] ' + j.motivo;
    }
    mostrarSucesso('Justificativa recusada.');
  } else {
    mostrarErro('Falha ao recusar justificativa.');
  }
}

onMounted(async () => {
  const j = await buscarJustificativasPendentes();
  justificativas.value = j.map((just) => {
    const texto = just.motivo ?? '';
    let status: JustificativaPendente['status'] = 'pendente';
    if (texto.startsWith('[ACEITA]')) status = 'aceita';
    else if (texto.startsWith('[RECUSADA]')) status = 'recusada';
    return { ...just, status };
  });
  canalJustificativas = supabaseClient
    .channel('justificativas-gestao')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'frequencias' }, () =>
      buscarJustificativasPendentes().then((r) => {
        justificativas.value = r.map((just) => {
          const texto = just.motivo ?? '';
          let status: JustificativaPendente['status'] = 'pendente';
          if (texto.startsWith('[ACEITA]')) status = 'aceita';
          else if (texto.startsWith('[RECUSADA]')) status = 'recusada';
          return { ...just, status };
        });
      }),
    )
    .subscribe();
});

onUnmounted(() => {
  if (canalJustificativas) supabaseClient.removeChannel(canalJustificativas);
});
</script>

<template>
  <div class="container py-4" style="max-width: 960px">
    <button type="button" class="btn btn-sm btn-outline-secondary mb-3" @click="router.back()">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
      Voltar
    </button>

    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h5 fw-bold mb-0">
        <i class="bi bi-clipboard-check text-info me-2" aria-hidden="true"></i>
        Validação de justificativas
      </h1>
      <span class="badge text-bg-warning">{{ justificativasPendentes.length }} pendente(s)</span>
    </div>

    <div v-if="mensagemSucesso" class="alert alert-success py-2 small mb-3" role="status">
      <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
      {{ mensagemSucesso }}
    </div>
    <div v-if="mensagemErro" class="alert alert-danger py-2 small mb-3" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      {{ mensagemErro }}
    </div>

    <div class="card border">
      <div class="card-body p-0">
        <FilaJustificativas
          :justificativas="justificativas"
          @aceitar="aceitarJustificativa"
          @recusar="recusarJustificativa"
          @ver-anexo="verAnexoJustificativa"
        />
      </div>
    </div>
  </div>
</template>
