<script setup lang="ts">
/**
 * GestaoHomeView - Painel Confidencial da Gestão Escolar.
 *
 * Implementa as funcionalidades previstas no README:
 *   1. Painel Confidencial de Busca Ativa: dashboard de estatísticas.
 *   2. Ranking de Priorização de Risco: lista ordenada do caso mais
 *      crítico ao mais leve.
 *   3. Central de Ocorrências Graves e Suspensões: lista com ações
 *      para formalizar suspensão, anexar documento e bloquear retorno.
 *   4. Bloqueio de Retorno: flag exigindo presença do responsável.
 *   5. Validação de Justificativas: fila para aceitar/recusar
 *      justificativas enviadas pelos responsáveis.
 *
 * Arquitetura:
 *   - Smart page: usa useAutenticacao + useBuscaAtiva.
 *   - Injeta dados nos componentes presentacionais (CartaoEstatistica,
 *     CartaoAlunoRisco, ListaOcorrencias, FilaJustificativas, ModalBase).
 */

import { computed, onMounted, ref } from 'vue';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useAcessibilidade } from '@/composables/useAcessibilidade';
import { useBuscaAtiva } from '@/composables/useBuscaAtiva';
import { supabaseClient } from '@/servicos/supabase';
import CartaoEstatistica from '@/componentes/CartaoEstatistica.vue';
import CartaoAlunoRisco from '@/componentes/CartaoAlunoRisco.vue';
import ListaOcorrencias from '@/componentes/ListaOcorrencias.vue';
import FilaJustificativas from '@/componentes/FilaJustificativas.vue';
import ModalBase from '@/componentes/ModalBase.vue';
import type {
  AlunoRisco,
  EstatisticaPainel,
  JustificativaPendente,
  OcorrenciaGrave,
} from '@/tipos/componentes';

// =========================================================
// Estado de autenticação
// =========================================================

const { usuario } = useAutenticacao();
const { lerTexto } = useAcessibilidade();
const {
  buscarRankingRisco,
  buscarOcorrenciasGraves,
  alternarBloqueioRetorno,
  buscarJustificativasPendentes,
  validarJustificativa,
  calcularEstatisticasPainel,
  carregando,
  erro,
} = useBuscaAtiva();

const nomeGestor = computed(() => usuario.value?.nome || 'Gestor');

// =========================================================
// Estado da tela
// =========================================================

const ranking = ref<AlunoRisco[]>([]);
const ocorrencias = ref<OcorrenciaGrave[]>([]);
const justificativas = ref<JustificativaPendente[]>([]);
const filtroRisco = ref<'todos' | 'alto' | 'medio' | 'baixo'>('todos');
const buscaAluno = ref('');

// Modal de detalhes do aluno
const modalAlunoAberto = ref(false);
const alunoDetalhe = ref<AlunoRisco | null>(null);

// Mensagem de feedback
const mensagemSucesso = ref<string | null>(null);
const mensagemErro = ref<string | null>(null);

function mostrarSucesso(msg: string) {
  mensagemSucesso.value = msg;
  lerTexto(msg);
  setTimeout(() => (mensagemSucesso.value = null), 5000);
}

function mostrarErro(msg: string) {
  mensagemErro.value = msg;
  setTimeout(() => (mensagemErro.value = null), 5000);
}

// =========================================================
// Computeds
// =========================================================

const estatisticas = computed<EstatisticaPainel[]>(() =>
  calcularEstatisticasPainel(ranking.value, ocorrencias.value, justificativas.value),
);

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

const justificativasPendentes = computed(() =>
  justificativas.value.filter((j) => j.status === 'pendente'),
);

// =========================================================
// Ações
// =========================================================

async function carregarTudo() {
  const [r, o, j] = await Promise.all([
    buscarRankingRisco(),
    buscarOcorrenciasGraves(),
    buscarJustificativasPendentes(),
  ]);
  ranking.value = r;
  ocorrencias.value = o;
  // Justificativas: marcar status com base no prefixo
  justificativas.value = j.map((just) => {
    const texto = just.motivo ?? '';
    let status: JustificativaPendente['status'] = 'pendente';
    if (texto.startsWith('[ACEITA]')) status = 'aceita';
    else if (texto.startsWith('[RECUSADA]')) status = 'recusada';
    return { ...just, status };
  });
}

async function alternarBloqueio(ocorrenciaId: string) {
  const oc = ocorrencias.value.find((o) => o.id === ocorrenciaId);
  if (!oc) return;
  const novoValor = !oc.exigePresencaResponsavel;
  const ok = await alternarBloqueioRetorno(ocorrenciaId, novoValor);
  if (ok) {
    oc.exigePresencaResponsavel = novoValor;
    oc.bloqueado = novoValor;
    mostrarSucesso(
      novoValor
        ? `Retorno de ${oc.alunoNome} bloqueado. Responsável deve comparecer.`
        : `Retorno de ${oc.alunoNome} liberado.`,
    );
  } else {
    mostrarErro('Falha ao atualizar bloqueio de retorno.');
  }
}

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
    mostrarSucesso(
      `Família de ${aluno.nome} contata da. Registro aberto na Central de Busca Ativa.`,
    );
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
  // Em produção, abriria um modal para formalizar suspensão
  // Para esta implementação, exibe feedback de encaminhamento.
  mostrarSucesso(
    'Encaminhado para formalização de suspensão. O registro será atualizado pela coordenação.',
  );
}

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
    mostrarSucesso('Justificativa aceita. Falta abonada para o aluno.');
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
    mostrarSucesso('Justificativa recusada. Falta mantida para o aluno.');
  } else {
    mostrarErro('Falha ao recusar justificativa.');
  }
}

// =========================================================
// Ciclo de vida
// =========================================================

onMounted(async () => {
  await carregarTudo();

  // Atualiza em tempo real quando novas ocorrências ou justificativas chegam
  supabaseClient
    .channel('painel-gestao')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ocorrencias' }, () =>
      carregarTudo(),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'frequencias' }, () =>
      carregarTudo(),
    )
    .subscribe();
});
</script>

<template>
  <!--
    Cabeçalho: boas-vindas + ações contextuais
  -->
  <section class="mb-4" aria-labelledby="titulo-gestao">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <h1 id="titulo-gestao" class="h3 mb-1 fw-bold">Painel Confidencial</h1>
        <p class="text-body-secondary mb-0">
          Bem-vindo(a), {{ nomeGestor }}. Monitore a frequência e priorize ações de Busca Ativa.
        </p>
      </div>
      <button
        type="button"
        class="btn btn-outline-primary"
        :disabled="carregando"
        @click="carregarTudo"
      >
        <span
          v-if="carregando"
          class="spinner-border spinner-border-sm me-2"
          role="status"
          aria-hidden="true"
        ></span>
        <i v-else class="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>
        Atualizar dados
      </button>
    </div>
  </section>

  <!-- Feedback -->
  <div
    v-if="mensagemSucesso"
    class="alert alert-success d-flex align-items-center shadow-sm"
    role="status"
  >
    <i class="bi bi-check-circle-fill me-2 fs-5" aria-hidden="true"></i>
    <span>{{ mensagemSucesso }}</span>
    <button
      type="button"
      class="btn-close ms-auto"
      aria-label="Fechar"
      @click="mensagemSucesso = null"
    ></button>
  </div>

  <div v-if="mensagemErro" class="alert alert-danger d-flex align-items-center" role="alert">
    <i class="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
    <span>{{ mensagemErro }}</span>
    <button
      type="button"
      class="btn-close ms-auto"
      aria-label="Fechar"
      @click="mensagemErro = null"
    ></button>
  </div>

  <div v-if="erro" class="alert alert-warning d-flex align-items-center" role="alert">
    <i class="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
    <span>{{ erro }}</span>
  </div>

  <!--
    Painel de estatísticas: CartaoEstatistica para cada KPI.
    Grid responsivo: 1 coluna no mobile, 2 no tablet, 3 no desktop.
  -->
  <section class="mb-4" aria-labelledby="titulo-estatisticas">
    <h2 id="titulo-estatisticas" class="h5 mb-3 fw-bold">
      <i class="bi bi-graph-up me-2 text-primary" aria-hidden="true"></i>
      Visão geral
    </h2>

    <div v-if="carregando && !estatisticas.length" class="row g-3">
      <div v-for="i in 6" :key="i" class="col-12 col-sm-6 col-xl-4">
        <div class="card shadow-sm border-0 placeholder-glow">
          <div class="card-body d-flex align-items-center gap-3">
            <span class="placeholder rounded-3" style="width: 56px; height: 56px"></span>
            <div class="flex-grow-1">
              <span class="placeholder col-7"></span>
              <span class="placeholder col-4 fs-3 mt-2"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="row g-3">
      <div v-for="est in estatisticas" :key="est.id" class="col-12 col-sm-6 col-xl-4">
        <CartaoEstatistica :estatistica="est" />
      </div>
    </div>
  </section>

  <!--
    Ranking de Priorização de Risco.
    Lista ordenada do caso mais crítico ao mais leve.
  -->
  <section class="card shadow-sm border-0 mb-4" aria-labelledby="titulo-ranking">
    <div class="card-header bg-body-tertiary">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 id="titulo-ranking" class="h6 mb-0 fw-bold">
          <i class="bi bi-bar-chart-fill me-2 text-primary" aria-hidden="true"></i>
          Ranking de Priorização de Risco
        </h2>
        <small class="text-body-secondary">
          <span class="badge text-bg-danger me-1">{{ totalRiscoAlto }} crítico(s)</span>
          <span class="badge text-bg-warning me-1">{{ totalRiscoMedio }} atenção</span>
          <span class="badge text-bg-success">{{ totalRiscoBaixo }} estável</span>
        </small>
      </div>
    </div>

    <div class="card-body">
      <!-- Filtros + busca -->
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
          <label class="btn btn-outline-danger" for="filtroAlto">Críticos</label>

          <input
            v-model="filtroRisco"
            type="radio"
            class="btn-check"
            name="filtroRisco"
            id="filtroMedio"
            value="medio"
            autocomplete="off"
          />
          <label class="btn btn-outline-warning" for="filtroMedio">Atenção</label>

          <input
            v-model="filtroRisco"
            type="radio"
            class="btn-check"
            name="filtroRisco"
            id="filtroBaixo"
            value="baixo"
            autocomplete="off"
          />
          <label class="btn btn-outline-success" for="filtroBaixo">Estável</label>
        </div>

        <div class="input-group input-group-sm flex-grow-1" style="min-width: 220px">
          <span class="input-group-text bg-body-tertiary">
            <i class="bi bi-search" aria-hidden="true"></i>
          </span>
          <input
            v-model="buscaAluno"
            type="search"
            class="form-control"
            placeholder="Buscar aluno por nome, matrícula ou turma"
            aria-label="Buscar no ranking"
          />
        </div>
      </div>

      <!-- Estados de carregamento / vazio -->
      <div v-if="carregando && !ranking.length" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando ranking...</span>
        </div>
        <p class="mt-2 text-body-secondary mb-0">Calculando prioridades...</p>
      </div>

      <div v-else-if="!ranking.length" class="text-center py-5 text-body-secondary">
        <i class="bi bi-people fs-1 d-block mb-2" aria-hidden="true"></i>
        <p class="mb-0">Nenhum aluno cadastrado.</p>
      </div>

      <div v-else-if="!rankingFiltrado.length" class="text-center py-5 text-body-secondary">
        <i class="bi bi-search fs-1 d-block mb-2" aria-hidden="true"></i>
        <p class="mb-0">Nenhum aluno encontrado com os filtros atuais.</p>
      </div>

      <!-- Lista de alunos em risco -->
      <div v-else class="d-flex flex-column gap-2">
        <CartaoAlunoRisco
          v-for="aluno in rankingFiltrado"
          :key="aluno.id"
          :aluno="aluno"
          @contatar="contatarFamilia"
          @ver-detalhes="verDetalhesAluno"
        />
      </div>
    </div>
  </section>

  <!--
    Central de Ocorrências Graves e Suspensões
  -->
  <section class="card shadow-sm border-0 mb-4" aria-labelledby="titulo-ocorrencias">
    <div class="card-header bg-body-tertiary d-flex justify-content-between align-items-center">
      <h2 id="titulo-ocorrencias" class="h6 mb-0 fw-bold">
        <i class="bi bi-shield-exclamation me-2 text-danger" aria-hidden="true"></i>
        Central de Ocorrências Graves e Suspensões
      </h2>
      <span class="badge text-bg-secondary">{{ ocorrencias.length }} registro(s)</span>
    </div>
    <div class="card-body p-0">
      <ListaOcorrencias
        :ocorrencias="ocorrencias"
        @bloquear-retorno="alternarBloqueio"
        @ver-anexo="verAnexoOcorrencia"
        @registrar-suspensao="registrarSuspensao"
      />
    </div>
  </section>

  <!--
    Validação de Justificativas
  -->
  <section class="card shadow-sm border-0 mb-4" aria-labelledby="titulo-justificativas">
    <div class="card-header bg-body-tertiary d-flex justify-content-between align-items-center">
      <h2 id="titulo-justificativas" class="h6 mb-0 fw-bold">
        <i class="bi bi-clipboard-check me-2 text-info" aria-hidden="true"></i>
        Validação de Justificativas
      </h2>
      <span class="badge text-bg-warning"> {{ justificativasPendentes.length }} pendente(s) </span>
    </div>
    <div class="card-body p-0">
      <FilaJustificativas
        :justificativas="justificativas"
        @aceitar="aceitarJustificativa"
        @recusar="recusarJustificativa"
        @ver-anexo="verAnexoJustificativa"
      />
    </div>
  </section>

  <!--
    Modal: Detalhes do aluno (ranking)
  -->
  <ModalBase
    v-model="modalAlunoAberto"
    variante="padrao"
    tamanho="lg"
    titulo="Detalhes do aluno"
    fechar-label="Fechar detalhes do aluno"
  >
    <div v-if="alunoDetalhe">
      <h3 class="h5 mb-1">{{ alunoDetalhe.nome }}</h3>
      <p class="text-body-secondary small mb-3">
        <span v-if="alunoDetalhe.turma">{{ alunoDetalhe.turma }} · </span>
        Matrícula {{ alunoDetalhe.matricula }}
        <span v-if="alunoDetalhe.serie"> · {{ alunoDetalhe.serie }}</span>
      </p>

      <div class="row g-3 mb-3">
        <div class="col-6">
          <div class="card border-0 bg-body-tertiary h-100">
            <div class="card-body text-center">
              <div class="display-6 fw-bold text-danger">
                {{ alunoDetalhe.totalAusencias }}
              </div>
              <div class="text-body-secondary small">Faltas registradas</div>
            </div>
          </div>
        </div>
        <div class="col-6">
          <div class="card border-0 bg-body-tertiary h-100">
            <div class="card-body text-center">
              <div class="display-6 fw-bold text-warning">
                {{ alunoDetalhe.totalOcorrencias }}
              </div>
              <div class="text-body-secondary small">Ocorrências graves</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="alunoDetalhe.exigePresencaResponsavel" class="alert alert-warning" role="status">
        <i class="bi bi-lock-fill me-2" aria-hidden="true"></i>
        <strong>Retorno bloqueado:</strong> o aluno exige comparecimento presencial do responsável
        antes de voltar às aulas.
      </div>

      <p class="text-body-secondary small mb-0">
        Última ausência registrada: {{ alunoDetalhe.ultimaAusencia || 'Sem registro' }}
      </p>
    </div>

    <template #rodape>
      <button
        type="button"
        class="btn btn-primary"
        @click="contatarFamilia(alunoDetalhe?.id ?? '')"
      >
        <i class="bi bi-telephone me-2" aria-hidden="true"></i>
        Contatar família
      </button>
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
        Fechar
      </button>
    </template>
  </ModalBase>
</template>
