<script setup lang="ts">
/**
 * ProfessorHomeView - Painel do Professor.
 *
 * Implementa as funcionalidades previstas no README:
 *   1. Registro de Frequência por Exceção: assume PRESENÇA de
 *      todos; o professor marca AUSÊNCIA com um toque.
 *   2. Controle de Ausência na Aula: modal para registrar que
 *      o aluno esteve na escola mas se ausentou de uma aula
 *      específica.
 *   3. Foco Restrito no Comportamento Extremo: modal para
 *      registrar ocorrência grave ou suspensão.
 *
 * Arquitetura:
 *   - Smart page: usa useAutenticacao para obter o professor e
 *     useBuscaAtiva para buscar/mutar dados via Supabase.
 *   - Injeta dados nos componentes presentacionais (CartaoAlunoFrequencia,
 *     ModalBase). Nenhum dado hardcoded nos componentes.
 */

import { computed, onMounted, ref } from 'vue';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useAcessibilidade } from '@/composables/useAcessibilidade';
import { useBuscaAtiva } from '@/composables/useBuscaAtiva';
import { supabaseClient } from '@/servicos/supabase';
import CartaoAlunoFrequencia from '@/componentes/CartaoAlunoFrequencia.vue';
import ModalBase from '@/componentes/ModalBase.vue';
import type { AlunoFrequencia } from '@/tipos/componentes';

// =========================================================
// Estado de autenticação e acessibilidade
// =========================================================

const { usuario } = useAutenticacao();
const { lerTexto } = useAcessibilidade();
const {
  buscarAlunosParaFrequencia,
  registrarFrequenciaEmMassa,
  registrarAusenciaEmPeriodo,
  registrarOcorrenciaGrave,
  carregando,
  erro,
} = useBuscaAtiva();

// =========================================================
// Estado da tela
// =========================================================

const nomeProfessor = computed(() => usuario.value?.nome || 'Professor');

const alunos = ref<AlunoFrequencia[]>([]);
const buscaAluno = ref('');
const periodoSelecionado = ref('Dia completo');
const dataAula = ref(new Date().toISOString().slice(0, 10));

// Períodos disponíveis para o registro de ausência em aula
const periodosAula = [
  'Dia completo',
  '1º Horário',
  '2º Horário',
  '3º Horário',
  '4º Horário',
  'Manhã',
  'Tarde',
];

// =========================================================
// Modal: Ausência em aula específica
// =========================================================

const modalAusenciaAberto = ref(false);
const alunoAusenciaSelecionado = ref<AlunoFrequencia | null>(null);
const periodoAusenciaSelecionado = ref('1º Horário');
const justificativaAusencia = ref('');

// =========================================================
// Modal: Ocorrência grave / suspensão
// =========================================================

const modalOcorrenciaAberto = ref(false);
const alunoOcorrenciaId = ref('');
const alunoOcorrenciaNome = ref('');
const tipoOcorrencia = ref<'grave' | 'suspensao'>('grave');
const descricaoOcorrencia = ref('');
const exigePresencaOcorrencia = ref(false);
const erroOcorrencia = ref<string | null>(null);

// =========================================================
// Estado de feedback (toast/sucesso)
// =========================================================

const mensagemSucesso = ref<string | null>(null);

function mostrarSucesso(msg: string) {
  mensagemSucesso.value = msg;
  lerTexto(msg);
  setTimeout(() => {
    mensagemSucesso.value = null;
  }, 5000);
}

// =========================================================
// Computeds derivados
// =========================================================

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

// =========================================================
// Ações
// =========================================================

async function carregarAlunos() {
  alunos.value = await buscarAlunosParaFrequencia();
}

function alternarAusencia(alunoId: string) {
  const aluno = alunos.value.find((a) => a.id === alunoId);
  if (aluno) {
    aluno.ausente = !aluno.ausente;
    if (!aluno.ausente) {
      aluno.periodosAusentes = [];
    }
  }
}

function abrirModalAusencia(alunoId: string) {
  const aluno = alunos.value.find((a) => a.id === alunoId);
  if (!aluno) return;
  alunoAusenciaSelecionado.value = aluno;
  periodoAusenciaSelecionado.value = '1º Horário';
  justificativaAusencia.value = '';
  modalAusenciaAberto.value = true;
}

async function confirmarAusenciaPeriodo() {
  if (!alunoAusenciaSelecionado.value || !usuario.value) return;
  const ok = await registrarAusenciaEmPeriodo(
    alunoAusenciaSelecionado.value.id,
    usuario.value.id,
    dataAula.value,
    periodoAusenciaSelecionado.value,
    justificativaAusencia.value.trim() || null,
  );

  if (ok) {
    // Atualiza visualmente o aluno
    if (alunoAusenciaSelecionado.value) {
      if (!alunoAusenciaSelecionado.value.periodosAusentes) {
        alunoAusenciaSelecionado.value.periodosAusentes = [];
      }
      alunoAusenciaSelecionado.value.periodosAusentes.push(periodoAusenciaSelecionado.value);
    }
    mostrarSucesso(
      `Ausência de ${alunoAusenciaSelecionado.value.nome} registrada para ${periodoAusenciaSelecionado.value}.`,
    );
    modalAusenciaAberto.value = false;
  }
}

function abrirModalOcorrencia(alunoId?: string) {
  if (alunoId) {
    const aluno = alunos.value.find((a) => a.id === alunoId);
    if (aluno) {
      alunoOcorrenciaId.value = aluno.id;
      alunoOcorrenciaNome.value = aluno.nome;
    }
  } else {
    alunoOcorrenciaId.value = '';
    alunoOcorrenciaNome.value = '';
  }
  tipoOcorrencia.value = 'grave';
  descricaoOcorrencia.value = '';
  exigePresencaOcorrencia.value = false;
  erroOcorrencia.value = null;
  modalOcorrenciaAberto.value = true;
}

async function confirmarOcorrencia() {
  if (!usuario.value) return;
  if (!alunoOcorrenciaId.value) {
    erroOcorrencia.value = 'Selecione um aluno.';
    return;
  }
  if (descricaoOcorrencia.value.trim().length < 10) {
    erroOcorrencia.value = 'Descreva a ocorrência com pelo menos 10 caracteres.';
    return;
  }

  const ok = await registrarOcorrenciaGrave(
    alunoOcorrenciaId.value,
    usuario.value.id,
    descricaoOcorrencia.value.trim(),
    tipoOcorrencia.value,
    exigePresencaOcorrencia.value,
  );

  if (ok) {
    mostrarSucesso('Ocorrência registrada e encaminhada para a gestão.');
    modalOcorrenciaAberto.value = false;
  } else {
    erroOcorrencia.value = 'Falha ao registrar ocorrência. Tente novamente.';
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
    lerTexto(errMsg);
  } else if (registradas > 0) {
    mostrarSucesso(`${registradas} ausência(s) registrada(s) com sucesso.`);
  } else {
    mostrarSucesso('Todos os alunos estão presentes. Nenhuma ausência registrada.');
  }
}

// =========================================================
// Ciclo de vida
// =========================================================

onMounted(async () => {
  await carregarAlunos();

  // Inscrição em mudanças em tempo real na tabela alunos
  supabaseClient
    .channel('alunos-professor')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () =>
      carregarAlunos(),
    )
    .subscribe();
});
</script>

<template>
  <!--
    Cabeçalho da página: boas-vindas + ações contextuais.
    Estas informações aparecem no topo do conteúdo principal.
  -->
  <section class="mb-4" aria-labelledby="titulo-professor">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h1 id="titulo-professor" class="h3 mb-1 fw-bold">Bem-vindo(a), {{ nomeProfessor }}</h1>
        <p class="text-body-secondary mb-0">
          Registre a frequência e ocorrências graves da sua turma em poucos cliques.
        </p>
      </div>
      <button type="button" class="btn btn-danger" @click="abrirModalOcorrencia()">
        <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
        Registrar ocorrência grave
      </button>
    </div>
  </section>

  <!--
    Feedback de sucesso (toast simplificado)
  -->
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
      aria-label="Fechar mensagem"
      @click="mensagemSucesso = null"
    ></button>
  </div>

  <!--
    Alerta de erro global (carregamento, etc.)
  -->
  <div v-if="erro" class="alert alert-warning d-flex align-items-center" role="alert">
    <i class="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
    <span>{{ erro }}</span>
  </div>

  <!--
    Cartão principal: Registro de Frequência por Exceção
  -->
  <section class="card shadow-sm border-0 mb-4" aria-labelledby="titulo-frequencia">
    <div
      class="card-header bg-body-tertiary d-flex flex-wrap justify-content-between align-items-center gap-2"
    >
      <h2 id="titulo-frequencia" class="h6 mb-0 fw-bold">
        <i class="bi bi-check2-square me-2 text-primary" aria-hidden="true"></i>
        Registro de Frequência por Exceção
      </h2>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <label for="dataAula" class="col-form-label col-form-label-sm text-body-secondary mb-0">
          Data
        </label>
        <input
          id="dataAula"
          v-model="dataAula"
          type="date"
          class="form-control form-control-sm"
          style="width: 160px"
        />
        <label for="periodoAula" class="col-form-label col-form-label-sm text-body-secondary mb-0">
          Período
        </label>
        <select
          id="periodoAula"
          v-model="periodoSelecionado"
          class="form-select form-select-sm"
          style="width: 160px"
        >
          <option v-for="p in periodosAula" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
    </div>

    <div class="card-body">
      <!--
        Aviso de princípio: o sistema assume presença por padrão.
        Texto curto, claro, para professores com pouco tempo.
      -->
      <div class="alert alert-info d-flex align-items-start gap-2 mb-3" role="note">
        <i class="bi bi-info-circle-fill mt-1" aria-hidden="true"></i>
        <div>
          <strong>Como funciona:</strong> Todos os alunos são considerados
          <strong>presentes</strong>. Toque em um aluno apenas para marcar <strong>falta</strong>.
          Use "Registrar ausência em aula" para faltas parciais (esteve na escola, mas faltou a uma
          aula específica).
        </div>
      </div>

      <!-- Barra de busca + totalizadores -->
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div class="input-group input-group-sm" style="max-width: 320px">
          <span class="input-group-text bg-body-tertiary">
            <i class="bi bi-search" aria-hidden="true"></i>
          </span>
          <input
            v-model="buscaAluno"
            type="search"
            class="form-control"
            placeholder="Buscar por nome, matrícula ou turma"
            aria-label="Buscar alunos"
          />
        </div>
        <div class="d-flex gap-2">
          <span class="badge text-bg-success fs-6">
            <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
            {{ totalAlunos - totalAusentesMarcados }} presentes
          </span>
          <span v-if="totalAusentesMarcados > 0" class="badge text-bg-danger fs-6">
            <i class="bi bi-x-circle me-1" aria-hidden="true"></i>
            {{ totalAusentesMarcados }} ausente(s)
          </span>
        </div>
      </div>

      <!--
        Estado de carregamento
      -->
      <div v-if="carregando && !alunos.length" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando alunos...</span>
        </div>
        <p class="mt-2 text-body-secondary mb-0">Carregando lista de alunos...</p>
      </div>

      <!--
        Estado vazio: nenhum aluno cadastrado
      -->
      <div v-else-if="!alunos.length" class="text-center py-5 text-body-secondary">
        <i class="bi bi-inbox fs-1 d-block mb-2" aria-hidden="true"></i>
        <p class="mb-0">Nenhum aluno cadastrado para a sua turma.</p>
      </div>

      <!--
        Estado vazio: busca sem resultados
      -->
      <div v-else-if="!alunosFiltrados.length" class="text-center py-5 text-body-secondary">
        <i class="bi bi-search fs-1 d-block mb-2" aria-hidden="true"></i>
        <p class="mb-0">Nenhum aluno encontrado para "{{ buscaAluno }}".</p>
      </div>

      <!--
        Lista de alunos: grid responsivo de cartões.
        Cada cartão é um componente DUMB que recebe o aluno via prop.
      -->
      <div v-else class="row g-2 g-md-3">
        <div v-for="aluno in alunosFiltrados" :key="aluno.id" class="col-12 col-md-6 col-xl-4">
          <CartaoAlunoFrequencia
            :aluno="aluno"
            @alternar="alternarAusencia"
            @registrar-ausencia-periodo="abrirModalAusencia"
          />
        </div>
      </div>
    </div>

    <div
      class="card-footer bg-body-tertiary d-flex flex-wrap justify-content-between align-items-center gap-2"
    >
      <small class="text-body-secondary">
        <i class="bi bi-info-circle me-1" aria-hidden="true"></i>
        Lembre-se: tocar em "Presente" marca ausência. Use o botão abaixo para salvar.
      </small>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="carregando || !alunos.length"
        @click="salvarFrequencia"
      >
        <span
          v-if="carregando"
          class="spinner-border spinner-border-sm me-2"
          role="status"
          aria-hidden="true"
        ></span>
        <i v-else class="bi bi-save me-2" aria-hidden="true"></i>
        Salvar frequência
      </button>
    </div>
  </section>

  <!--
    Modal: Registrar ausência em aula específica
  -->
  <ModalBase
    v-model="modalAusenciaAberto"
    variante="padrao"
    tamanho="lg"
    titulo="Registrar ausência em aula"
    fechar-label="Fechar modal de ausência em aula"
  >
    <div v-if="alunoAusenciaSelecionado">
      <div class="alert alert-light border d-flex align-items-center gap-2 mb-3">
        <i class="bi bi-person-circle text-primary fs-4" aria-hidden="true"></i>
        <div>
          <div class="fw-semibold">{{ alunoAusenciaSelecionado.nome }}</div>
          <small class="text-body-secondary">
            <span v-if="alunoAusenciaSelecionado.turma"
              >{{ alunoAusenciaSelecionado.turma }} ·
            </span>
            Matrícula {{ alunoAusenciaSelecionado.matricula }}
          </small>
        </div>
      </div>

      <p class="text-body-secondary small">
        Use este formulário quando o aluno esteve na escola mas se ausentou de uma aula específica
        (ex.: consultou o enfermeiro, foi à coordenação).
      </p>

      <div class="mb-3">
        <label for="periodoAusencia" class="form-label fw-semibold">Período da ausência</label>
        <select id="periodoAusencia" v-model="periodoAusenciaSelecionado" class="form-select">
          <option v-for="p in periodosAula.filter((p) => p !== 'Dia completo')" :key="p" :value="p">
            {{ p }}
          </option>
        </select>
      </div>

      <div class="mb-3">
        <label for="justificativaAusencia" class="form-label fw-semibold">
          Justificativa (opcional)
        </label>
        <textarea
          id="justificativaAusencia"
          v-model="justificativaAusencia"
          class="form-control"
          rows="3"
          placeholder="Ex.: Encaminhado à enfermaria, reunião pedagógica..."
        ></textarea>
      </div>
    </div>

    <template #rodape>
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
        Cancelar
      </button>
      <button
        type="button"
        class="btn btn-warning"
        :disabled="carregando"
        @click="confirmarAusenciaPeriodo"
      >
        <span
          v-if="carregando"
          class="spinner-border spinner-border-sm me-2"
          role="status"
          aria-hidden="true"
        ></span>
        <i v-else class="bi bi-save me-2" aria-hidden="true"></i>
        Registrar ausência
      </button>
    </template>
  </ModalBase>

  <!--
    Modal: Registrar ocorrência grave / suspensão
  -->
  <ModalBase
    v-model="modalOcorrenciaAberto"
    variante="padrao"
    tamanho="lg"
    titulo="Registrar ocorrência grave"
    fechar-label="Fechar modal de ocorrência"
  >
    <div class="alert alert-warning d-flex align-items-start gap-2" role="note">
      <i class="bi bi-shield-exclamation mt-1" aria-hidden="true"></i>
      <div>
        <strong>Atenção:</strong> Use este formulário apenas para comportamentos extremos que
        ameacem a permanência do aluno na escola. Pequenas indisciplinas diárias
        <strong>não</strong> devem ser registradas.
      </div>
    </div>

    <div v-if="erroOcorrencia" class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
      {{ erroOcorrencia }}
    </div>

    <div class="mb-3">
      <label for="alunoOcorrencia" class="form-label fw-semibold">Aluno</label>
      <select
        id="alunoOcorrencia"
        v-model="alunoOcorrenciaId"
        class="form-select"
        :disabled="!alunos.length"
      >
        <option value="" disabled>Selecione um aluno</option>
        <option v-for="a in alunos" :key="a.id" :value="a.id">
          {{ a.nome }} — {{ a.turma || 'Sem turma' }}
        </option>
      </select>
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Tipo de ocorrência</label>
      <div class="d-flex gap-3">
        <div class="form-check">
          <input
            id="tipoGrave"
            v-model="tipoOcorrencia"
            type="radio"
            value="grave"
            class="form-check-input"
          />
          <label for="tipoGrave" class="form-check-label">Ocorrência grave</label>
        </div>
        <div class="form-check">
          <input
            id="tipoSuspensao"
            v-model="tipoOcorrencia"
            type="radio"
            value="suspensao"
            class="form-check-input"
          />
          <label for="tipoSuspensao" class="form-check-label">Suspensão</label>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <label for="descricaoOcorrencia" class="form-label fw-semibold">
        Descrição da ocorrência
      </label>
      <textarea
        id="descricaoOcorrencia"
        v-model="descricaoOcorrencia"
        class="form-control"
        rows="4"
        placeholder="Descreva objetivamente o comportamento extremo observado. Mínimo 10 caracteres."
      ></textarea>
      <small class="text-body-secondary">
        Seja objetivo e factual. Evite julgamentos subjetivos.
      </small>
    </div>

    <div class="form-check mb-3">
      <input
        id="exigePresenca"
        v-model="exigePresencaOcorrencia"
        type="checkbox"
        class="form-check-input"
      />
      <label for="exigePresenca" class="form-check-label">
        Exigir presença do responsável na escola antes do retorno do aluno
        <small class="d-block text-body-secondary">
          Marque se a gravidade exige que o responsável compareça presencialmente para liberar o
          retorno às aulas.
        </small>
      </label>
    </div>

    <template #rodape>
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
        Cancelar
      </button>
      <button
        type="button"
        class="btn btn-danger"
        :disabled="carregando"
        @click="confirmarOcorrencia"
      >
        <span
          v-if="carregando"
          class="spinner-border spinner-border-sm me-2"
          role="status"
          aria-hidden="true"
        ></span>
        <i v-else class="bi bi-exclamation-octagon me-2" aria-hidden="true"></i>
        Registrar ocorrência
      </button>
    </template>
  </ModalBase>
</template>
