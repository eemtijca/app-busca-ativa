<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useAcessibilidade } from '@/composables/useAcessibilidade';
import { useBuscaAtiva } from '@/composables/useBuscaAtiva';
import type { AlunoFrequencia } from '@/tipos/componentes';

const router = useRouter();
const { usuario } = useAutenticacao();
const { buscarAlunosParaFrequencia, registrarAusenciaEmPeriodo, carregando } = useBuscaAtiva();
const { lerTexto } = useAcessibilidade();

const alunos = ref<AlunoFrequencia[]>([]);
const alunoId = ref('');
const periodo = ref('1º Horário');
const justificativa = ref('');
const mensagemErro = ref<string | null>(null);

const periodosAula = ['1º Horário', '2º Horário', '3º Horário', '4º Horário', 'Manhã', 'Tarde'];
const dataAula = ref(new Date().toISOString().slice(0, 10));

const alunoNome = computed(() => {
  const a = alunos.value.find((x) => x.id === alunoId.value);
  return a?.nome || '';
});

async function confirmar() {
  if (!usuario.value || !alunoId.value) {
    mensagemErro.value = 'Selecione um aluno.';
    return;
  }
  const ok = await registrarAusenciaEmPeriodo(
    alunoId.value,
    usuario.value.id,
    dataAula.value,
    periodo.value,
    justificativa.value.trim() || null,
  );
  if (ok) {
    lerTexto(`Ausência de ${alunoNome.value} registrada.`);
    router.back();
  } else {
    mensagemErro.value = 'Falha ao registrar. Tente novamente.';
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
      <i class="bi bi-clock-history text-warning me-2" aria-hidden="true"></i>
      Registrar ausência em aula
    </h1>

    <p class="text-body-secondary small mb-3">
      Use quando o aluno esteve na escola mas se ausentou de um período específico.
    </p>

    <div v-if="mensagemErro" class="alert alert-danger py-2 small mb-3" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      {{ mensagemErro }}
    </div>

    <div class="card border">
      <div class="card-body">
        <div class="mb-3">
          <label for="alunoSelect" class="form-label fw-semibold small">Aluno</label>
          <select id="alunoSelect" v-model="alunoId" class="form-select">
            <option value="" disabled>Selecione um aluno</option>
            <option v-for="a in alunos" :key="a.id" :value="a.id">
              {{ a.nome }} — {{ a.turma || 'Sem turma' }}
            </option>
          </select>
        </div>

        <div class="mb-3">
          <label for="periodoSelect" class="form-label fw-semibold small"
            >Período da ausência</label
          >
          <select id="periodoSelect" v-model="periodo" class="form-select">
            <option v-for="p in periodosAula" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>

        <div class="mb-3">
          <label for="justificativaText" class="form-label fw-semibold small"
            >Justificativa (opcional)</label
          >
          <textarea
            id="justificativaText"
            v-model="justificativa"
            class="form-control"
            rows="3"
            placeholder="Ex.: Encaminhado à enfermaria..."
          ></textarea>
        </div>

        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary" @click="router.back()">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-warning"
            :disabled="carregando || !alunoId"
            @click="confirmar"
          >
            <span
              v-if="carregando"
              class="spinner-border spinner-border-sm me-1"
              role="status"
            ></span>
            <i v-else class="bi bi-save me-1" aria-hidden="true"></i>
            Registrar ausência
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
