<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useMonitoramento } from '@/composables/useMonitoramento';
import type { AlunoFrequencia } from '@/tipos/componentes';

const router = useRouter();
const { usuario } = useAutenticacao();
const { buscarAlunosParaFrequencia, registrarOcorrenciaGrave, carregando } = useMonitoramento();

const alunos = ref<AlunoFrequencia[]>([]);
const alunoId = ref('');
const tipo = ref<'grave' | 'suspensao'>('grave');
const descricao = ref('');
const exigePresenca = ref(false);
const mensagemErro = ref<string | null>(null);

async function confirmar() {
  if (!usuario.value || !alunoId.value) {
    mensagemErro.value = 'Selecione um aluno.';
    return;
  }
  if (descricao.value.trim().length < 10) {
    mensagemErro.value = 'Descreva a ocorrência com pelo menos 10 caracteres.';
    return;
  }
  const ok = await registrarOcorrenciaGrave(
    alunoId.value,
    usuario.value.id,
    descricao.value.trim(),
    tipo.value,
    exigePresenca.value,
  );
  if (ok) {
    router.back();
  } else {
    mensagemErro.value = 'Falha ao registrar ocorrência. Tente novamente.';
  }
}

onMounted(async () => {
  alunos.value = await buscarAlunosParaFrequencia();
});
</script>

<template>
  <div class="container py-4" style="max-width: 640px">
    <button type="button" class="btn btn-sm btn-outline-secondary mb-3" @click="router.back()">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
      Voltar
    </button>

    <h1 class="h5 fw-bold mb-3">
      <i class="bi bi-exclamation-triangle text-danger me-2" aria-hidden="true"></i>
      Registrar ocorrência grave
    </h1>

    <div class="alert alert-warning d-flex align-items-start gap-2 small py-2 mb-3" role="note">
      <i class="bi bi-shield-exclamation mt-1" aria-hidden="true"></i>
      <span
        >Use apenas para comportamentos extremos que ameacem a permanência do aluno na escola.</span
      >
    </div>

    <div v-if="mensagemErro" class="alert alert-danger py-2 small mb-3" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      {{ mensagemErro }}
    </div>

    <div class="card border">
      <div class="card-body">
        <div class="mb-3">
          <label for="alunoSelect" class="form-label fw-semibold small">Aluno</label>
          <select id="alunoSelect" v-model="alunoId" class="form-select" :disabled="!alunos.length">
            <option value="" disabled>Selecione um aluno</option>
            <option v-for="a in alunos" :key="a.id" :value="a.id">
              {{ a.nome }} — {{ a.turma || 'Sem turma' }}
            </option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label fw-semibold small">Tipo de ocorrência</label>
          <div class="d-flex gap-3">
            <div class="form-check">
              <input
                id="tipoGrave"
                v-model="tipo"
                type="radio"
                value="grave"
                class="form-check-input"
              />
              <label for="tipoGrave" class="form-check-label small">Ocorrência grave</label>
            </div>
            <div class="form-check">
              <input
                id="tipoSuspensao"
                v-model="tipo"
                type="radio"
                value="suspensao"
                class="form-check-input"
              />
              <label for="tipoSuspensao" class="form-check-label small">Suspensão</label>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <label for="descricaoText" class="form-label fw-semibold small">Descrição</label>
          <textarea
            id="descricaoText"
            v-model="descricao"
            class="form-control"
            rows="4"
            placeholder="Descreva objetivamente o comportamento. Mínimo 10 caracteres."
          ></textarea>
        </div>

        <div class="form-check mb-3">
          <input
            id="exigePresenca"
            v-model="exigePresenca"
            type="checkbox"
            class="form-check-input"
          />
          <label for="exigePresenca" class="form-check-label small">
            Exigir presença do responsável na escola antes do retorno
          </label>
        </div>

        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary" @click="router.back()">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="carregando || !alunoId"
            @click="confirmar"
          >
            <span
              v-if="carregando"
              class="spinner-border spinner-border-sm me-1"
              role="status"
            ></span>
            <i v-else class="bi bi-exclamation-octagon me-1" aria-hidden="true"></i>
            Registrar ocorrência
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
