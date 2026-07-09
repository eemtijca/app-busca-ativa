<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBuscaAtiva } from '@/composables/useBuscaAtiva';
import { supabaseClient } from '@/servicos/supabase';
import ListaOcorrencias from '@/componentes/ListaOcorrencias.vue';
import type { OcorrenciaGrave } from '@/tipos/componentes';

const router = useRouter();
const { buscarOcorrenciasGraves, alternarBloqueioRetorno } = useBuscaAtiva();

const ocorrencias = ref<OcorrenciaGrave[]>([]);
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

async function alternarBloqueio(ocorrenciaId: string) {
  const oc = ocorrencias.value.find((o) => o.id === ocorrenciaId);
  if (!oc) return;
  const novoValor = !oc.exigePresencaResponsavel;
  const ok = await alternarBloqueioRetorno(ocorrenciaId, novoValor);
  if (ok) {
    oc.exigePresencaResponsavel = novoValor;
    oc.bloqueado = novoValor;
    mostrarSucesso(novoValor ? 'Retorno bloqueado.' : 'Retorno liberado.');
  } else {
    mostrarErro('Falha ao atualizar bloqueio.');
  }
}

function verAnexoOcorrencia(ocorrenciaId: string) {
  const oc = ocorrencias.value.find((o) => o.id === ocorrenciaId);
  if (oc?.anexoUrl) {
    window.open(oc.anexoUrl, '_blank', 'noopener');
  } else {
    mostrarErro('Documento não disponível.');
  }
}

function registrarSuspensao() {
  mostrarSucesso('Encaminhado para formalização de suspensão.');
}

onMounted(async () => {
  ocorrencias.value = await buscarOcorrenciasGraves();
  supabaseClient
    .channel('ocorrencias-gestao')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ocorrencias' }, () =>
      buscarOcorrenciasGraves().then((r) => (ocorrencias.value = r)),
    )
    .subscribe();
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
        <i class="bi bi-shield-exclamation text-danger me-2" aria-hidden="true"></i>
        Ocorrências graves e suspensões
      </h1>
      <span class="badge text-bg-secondary">{{ ocorrencias.length }} registro(s)</span>
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
        <ListaOcorrencias
          :ocorrencias="ocorrencias"
          @bloquear-retorno="alternarBloqueio"
          @ver-anexo="verAnexoOcorrencia"
          @registrar-suspensao="registrarSuspensao"
        />
      </div>
    </div>
  </div>
</template>
