<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAcessibilidade } from '@/composables/useAcessibilidade';
import { useBuscaAtiva } from '@/composables/useBuscaAtiva';
import { supabaseClient } from '@/servicos/supabase';
import CartaoAlunoRisco from '@/componentes/CartaoAlunoRisco.vue';
import ModalBase from '@/componentes/ModalBase.vue';
import type { AlunoRisco } from '@/tipos/componentes';

const router = useRouter();
const { lerTexto } = useAcessibilidade();
const { buscarRankingRisco, carregando } = useBuscaAtiva();

const ranking = ref<AlunoRisco[]>([]);
const filtroRisco = ref<'todos' | 'alto' | 'medio' | 'baixo'>('todos');
const buscaAluno = ref('');

const modalAlunoAberto = ref(false);
const alunoDetalhe = ref<AlunoRisco | null>(null);

const rankingFiltrado = computed(() => {
  let lista = ranking.value;
  if (filtroRisco.value !== 'todos') {
    lista = lista.filter((a) => a.nivel === filtroRisco.value);
  }
  if (buscaAluno.value.trim()) {
    const termo = buscaAluno.value.toLowerCase().trim();
    lista = lista.filter(
      (a) =>
        a.nome.toLowerCase().includes(termo) ||
        a.matricula.toLowerCase().includes(termo) ||
        (a.turma ?? '').toLowerCase().includes(termo),
    );
  }
  return lista;
});

const totalRiscoAlto = computed(() => ranking.value.filter((r) => r.nivel === 'alto').length);
const totalRiscoMedio = computed(() => ranking.value.filter((r) => r.nivel === 'medio').length);
const totalRiscoBaixo = computed(() => ranking.value.filter((r) => r.nivel === 'baixo').length);

function verDetalhesAluno(alunoId: string) {
  const aluno = ranking.value.find((a) => a.id === alunoId);
  if (aluno) {
    alunoDetalhe.value = aluno;
    modalAlunoAberto.value = true;
  }
}

function contatarFamilia(alunoId: string) {
  const aluno = ranking.value.find((a) => a.id === alunoId);
  if (aluno) {
    lerTexto(`Família de ${aluno.nome} contatada.`);
  }
}

onMounted(async () => {
  ranking.value = await buscarRankingRisco();
  supabaseClient
    .channel('ranking')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'frequencias' }, () =>
      buscarRankingRisco().then((r) => (ranking.value = r)),
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

    <h1 class="h5 fw-bold mb-3">
      <i class="bi bi-bar-chart text-danger me-2" aria-hidden="true"></i>
      Ranking de priorização de risco
    </h1>

    <div class="d-flex flex-wrap gap-2 mb-3">
      <div class="btn-group btn-group-sm" role="group" aria-label="Filtrar por nível de risco">
        <input
          v-model="filtroRisco"
          type="radio"
          class="btn-check"
          name="filtroRisco"
          id="filtroTodos"
          value="todos"
          autocomplete="off"
        />
        <label class="btn btn-outline-secondary" for="filtroTodos">Todos</label>
        <input
          v-model="filtroRisco"
          type="radio"
          class="btn-check"
          name="filtroRisco"
          id="filtroAlto"
          value="alto"
          autocomplete="off"
        />
        <label class="btn btn-outline-secondary" for="filtroAlto">Críticos</label>
        <input
          v-model="filtroRisco"
          type="radio"
          class="btn-check"
          name="filtroRisco"
          id="filtroMedio"
          value="medio"
          autocomplete="off"
        />
        <label class="btn btn-outline-secondary" for="filtroMedio">Atenção</label>
        <input
          v-model="filtroRisco"
          type="radio"
          class="btn-check"
          name="filtroRisco"
          id="filtroBaixo"
          value="baixo"
          autocomplete="off"
        />
        <label class="btn btn-outline-secondary" for="filtroBaixo">Estável</label>
      </div>
      <div class="input-group input-group-sm flex-grow-1" style="min-width: 200px">
        <span class="input-group-text bg-body-tertiary"
          ><i class="bi bi-search" aria-hidden="true"></i
        ></span>
        <input
          v-model="buscaAluno"
          type="search"
          class="form-control"
          placeholder="Buscar aluno"
          aria-label="Buscar no ranking"
        />
      </div>
    </div>

    <div class="d-flex gap-2 mb-3 small">
      <span class="badge text-bg-danger">{{ totalRiscoAlto }} crítico</span>
      <span class="badge text-bg-warning">{{ totalRiscoMedio }} atenção</span>
      <span class="badge text-bg-success">{{ totalRiscoBaixo }} estável</span>
    </div>

    <div v-if="carregando && !ranking.length" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Carregando...</span>
      </div>
      <p class="mt-2 text-body-secondary small mb-0">Calculando prioridades...</p>
    </div>

    <div v-else-if="!ranking.length" class="text-center py-5 text-body-secondary">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-circle bg-body-tertiary mb-3"
        style="width: 72px; height: 72px"
      >
        <i class="bi bi-people fs-4 opacity-50" aria-hidden="true"></i>
      </span>
      <p class="mb-0 small">Nenhum aluno cadastrado.</p>
    </div>

    <div v-else-if="!rankingFiltrado.length" class="text-center py-5 text-body-secondary">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-circle bg-body-tertiary mb-3"
        style="width: 72px; height: 72px"
      >
        <i class="bi bi-search fs-4 opacity-50" aria-hidden="true"></i>
      </span>
      <p class="mb-0 small">Nenhum aluno encontrado com os filtros atuais.</p>
    </div>

    <div v-else class="d-flex flex-column gap-2">
      <CartaoAlunoRisco
        v-for="aluno in rankingFiltrado"
        :key="aluno.id"
        :aluno="aluno"
        @contatar="contatarFamilia"
        @ver-detalhes="verDetalhesAluno"
      />
    </div>

    <ModalBase
      v-model="modalAlunoAberto"
      variante="padrao"
      tamanho="lg"
      titulo="Detalhes do aluno"
      fechar-label="Fechar"
    >
      <div v-if="alunoDetalhe">
        <h3 class="h5 mb-1">{{ alunoDetalhe.nome }}</h3>
        <p class="text-body-secondary small mb-3">
          <span v-if="alunoDetalhe.turma">{{ alunoDetalhe.turma }} · </span>
          Matrícula {{ alunoDetalhe.matricula }}
        </p>
        <div class="row g-3 mb-3">
          <div class="col-6">
            <div class="card border-0 bg-body-tertiary h-100">
              <div class="card-body text-center">
                <div class="fs-4 fw-bold text-danger">{{ alunoDetalhe.totalAusencias }}</div>
                <div class="text-body-secondary small">Faltas registradas</div>
              </div>
            </div>
          </div>
          <div class="col-6">
            <div class="card border-0 bg-body-tertiary h-100">
              <div class="card-body text-center">
                <div class="fs-4 fw-bold text-warning">{{ alunoDetalhe.totalOcorrencias }}</div>
                <div class="text-body-secondary small">Ocorrências graves</div>
              </div>
            </div>
          </div>
        </div>
        <p class="text-body-secondary small mb-0">
          Última ausência: {{ alunoDetalhe.ultimaAusencia || 'Sem registro' }}
        </p>
      </div>
    </ModalBase>
  </div>
</template>
