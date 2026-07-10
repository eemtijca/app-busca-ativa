<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useBuscaAtiva } from '@/composables/useBuscaAtiva';
import CartaoAlunoFrequencia from '@/componentes/CartaoAlunoFrequencia.vue';
import type { AlunoFrequencia } from '@/tipos/componentes';

const router = useRouter();
const { usuario } = useAutenticacao();
const { buscarAlunosParaFrequencia, registrarFrequenciaEmMassa, carregando } = useBuscaAtiva();

const alunos = ref<AlunoFrequencia[]>([]);
const buscaAluno = ref('');
const dataAula = ref(new Date().toISOString().slice(0, 10));
const periodoSelecionado = ref('Dia completo');
const mensagemSucesso = ref<string | null>(null);

const periodosAula = [
  'Dia completo',
  '1º Horário',
  '2º Horário',
  '3º Horário',
  '4º Horário',
  'Manhã',
  'Tarde',
];

const alunosFiltrados = computed(() => {
  if (!buscaAluno.value.trim()) return alunos.value;
  const termo = buscaAluno.value.toLowerCase().trim();
  return alunos.value.filter(
    (a) =>
      a.nome.toLowerCase().includes(termo) ||
      a.matricula.toLowerCase().includes(termo) ||
      (a.turma ?? '').toLowerCase().includes(termo),
  );
});

const totalAusentesMarcados = computed(() => alunos.value.filter((a) => a.ausente).length);
const totalAlunos = computed(() => alunos.value.length);

function alternarAusencia(alunoId: string) {
  const aluno = alunos.value.find((a) => a.id === alunoId);
  if (aluno) {
    aluno.ausente = !aluno.ausente;
    if (!aluno.ausente) {
      aluno.periodosAusentes = [];
    }
  }
}

async function salvarFrequencia() {
  if (!usuario.value) return;
  const { registradas, erro: errMsg } = await registrarFrequenciaEmMassa(
    alunos.value,
    usuario.value.id,
    dataAula.value,
    periodoSelecionado.value,
  );
  if (errMsg) {
    mensagemSucesso.value = errMsg;
  } else if (registradas > 0) {
    mensagemSucesso.value = `${registradas} ausência(s) registrada(s) com sucesso.`;
  } else {
    mensagemSucesso.value = 'Todos os alunos estão presentes. Nenhuma ausência registrada.';
  }
  setTimeout(() => (mensagemSucesso.value = null), 4000);
}

onMounted(async () => {
  alunos.value = await buscarAlunosParaFrequencia();
});
</script>

<template>
  <div class="container py-4" style="max-width: 960px">
    <button type="button" class="btn btn-sm btn-outline-secondary mb-3" @click="router.back()">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
      Voltar
    </button>

    <h1 class="h5 fw-bold mb-3">
      <i class="bi bi-check2-square text-primary me-2" aria-hidden="true"></i>
      Registrar frequência
    </h1>

    <div class="card border mb-4">
      <div
        class="card-header bg-body-tertiary d-flex flex-wrap justify-content-between align-items-center gap-2"
      >
        <span class="fw-semibold small">Registro de frequência por exceção</span>
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <label for="dataAula" class="col-form-label col-form-label-sm text-body-secondary mb-0"
            >Data</label
          >
          <input
            id="dataAula"
            v-model="dataAula"
            type="date"
            class="form-control form-control-sm"
            style="width: 150px"
          />
          <label for="periodoAula" class="col-form-label col-form-label-sm text-body-secondary mb-0"
            >Período</label
          >
          <select
            id="periodoAula"
            v-model="periodoSelecionado"
            class="form-select form-select-sm"
            style="width: 150px"
          >
            <option v-for="p in periodosAula" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
      </div>

      <div class="card-body">
        <div class="alert alert-info d-flex align-items-start gap-2 mb-3 py-2 small" role="note">
          <i class="bi bi-info-circle mt-1" aria-hidden="true"></i>
          <span
            >Todos os alunos são considerados <strong>presentes</strong>. Toque para marcar
            <strong>falta</strong>.</span
          >
        </div>

        <div v-if="mensagemSucesso" class="alert alert-success py-2 mb-3 small" role="status">
          <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
          {{ mensagemSucesso }}
        </div>

        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div class="input-group input-group-sm" style="max-width: 280px">
            <span class="input-group-text bg-body-tertiary">
              <i class="bi bi-search" aria-hidden="true"></i>
            </span>
            <input
              v-model="buscaAluno"
              type="search"
              class="form-control"
              placeholder="Buscar aluno"
              aria-label="Buscar alunos"
            />
          </div>
          <div class="d-flex gap-2">
            <span class="badge text-bg-success"
              >{{ totalAlunos - totalAusentesMarcados }} presentes</span
            >
            <span v-if="totalAusentesMarcados > 0" class="badge text-bg-danger"
              >{{ totalAusentesMarcados }} ausente(s)</span
            >
          </div>
        </div>

        <div v-if="carregando && !alunos.length" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
          </div>
        </div>

        <div v-else-if="!alunos.length" class="text-center py-5 text-body-secondary">
          <span
            class="d-inline-flex align-items-center justify-content-center rounded-circle bg-body-tertiary mb-3"
            style="width: 72px; height: 72px"
          >
            <i class="bi bi-inbox fs-4 opacity-50" aria-hidden="true"></i>
          </span>
          <p class="mb-0 small">Nenhum aluno cadastrado para a sua turma.</p>
        </div>

        <div v-else-if="!alunosFiltrados.length" class="text-center py-5 text-body-secondary">
          <span
            class="d-inline-flex align-items-center justify-content-center rounded-circle bg-body-tertiary mb-3"
            style="width: 72px; height: 72px"
          >
            <i class="bi bi-search fs-4 opacity-50" aria-hidden="true"></i>
          </span>
          <p class="mb-0 small">Nenhum aluno encontrado.</p>
        </div>

        <div v-else class="row g-2 g-md-3">
          <div v-for="aluno in alunosFiltrados" :key="aluno.id" class="col-12 col-md-6 col-xl-4">
            <CartaoAlunoFrequencia :aluno="aluno" @alternar="alternarAusencia" />
          </div>
        </div>
      </div>

      <div class="card-footer bg-body-tertiary d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="router.back()">
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="carregando || !alunos.length"
          @click="salvarFrequencia"
        >
          <span
            v-if="carregando"
            class="spinner-border spinner-border-sm me-1"
            role="status"
          ></span>
          <i v-else class="bi bi-save me-1" aria-hidden="true"></i>
          Salvar frequência
        </button>
      </div>
    </div>
  </div>
</template>
