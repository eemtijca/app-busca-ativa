<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useMonitoramento } from '@/composables/useMonitoramento';
import FormularioJustificativa from '@/componentes/FormularioJustificativa.vue';
import type { Aluno } from '@/tipos/database';

const router = useRouter();
const { usuario } = useAutenticacao();
const { buscarFilhosDoResponsavel, enviarJustificativa } = useMonitoramento();

const filhos = ref<Aluno[]>([]);
const filhoSelecionado = ref<Aluno | null>(null);
const enviando = ref(false);
const mensagemSucesso = ref<string | null>(null);
const mensagemErro = ref<string | null>(null);

async function handleEnviarJustificativa(payload: {
  motivo: string;
  dataAusencia: string;
  arquivo: File | null;
}) {
  if (!usuario.value || !filhoSelecionado.value) {
    mensagemErro.value = 'Selecione um filho antes de enviar a justificativa.';
    return;
  }
  enviando.value = true;
  try {
    const ok = await enviarJustificativa(
      filhoSelecionado.value.id,
      usuario.value.id,
      payload.dataAusencia,
      payload.motivo,
      payload.arquivo,
      usuario.value.id,
    );
    if (ok) {
      mensagemSucesso.value = 'Justificativa enviada com sucesso.';
      setTimeout(() => router.back(), 1500);
    } else {
      mensagemErro.value = 'Falha ao enviar justificativa. Tente novamente.';
    }
  } finally {
    enviando.value = false;
  }
}

onMounted(async () => {
  if (usuario.value) {
    filhos.value = await buscarFilhosDoResponsavel(usuario.value.id);
    filhoSelecionado.value = filhos.value[0] || null;
  }
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

    <h1 class="h5 fw-bold mb-3">
      <i class="bi bi-paperclip text-success me-2" aria-hidden="true"></i>
      Enviar justificativa
    </h1>

    <div v-if="filhos.length > 1" class="mb-3">
      <label for="filhoSelect" class="form-label fw-semibold small">Aluno</label>
      <select id="filhoSelect" class="form-select" v-model="filhoSelecionado">
        <option v-for="f in filhos" :key="f.id" :value="f">
          {{ f.nome }}<span v-if="f.matricula"> — {{ f.matricula }}</span>
        </option>
      </select>
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
      <div class="card-body">
        <FormularioJustificativa
          :aluno-nome="filhoSelecionado?.nome || ''"
          :aluno-turma="''"
          :enviando="enviando"
          @enviar="handleEnviarJustificativa"
        />
        </div>
    </div>
  </div>
</template>
