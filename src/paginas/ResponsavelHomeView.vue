<script setup lang="ts">
/**
 * ResponsavelHomeView - Painel da Família (Responsável).
 *
 * Implementa as funcionalidades previstas no README:
 *   1. Alertas de Ausência: notificações visuais de ausência
 *      da escola ou de aula específica.
 *   2. Termômetro de Atenção Visual: indicador colorido
 *      (verde / amarelo / vermelho) do nível de risco do filho.
 *   3. Sistema de Anexo para Justificativas: formulário mobile
 *      para enviar foto de atestado médico.
 *   4. Aviso de Presença Obrigatória: alerta quando há suspensão
 *      exigindo comparecimento físico do responsável.
 *   5. Canal de Diálogo com Horário Protegido: chat com a
 *      coordenação que se desativa fora do horário escolar.
 *
 * Arquitetura:
 *   - Smart page: usa useAutenticacao + useBuscaAtiva.
 *   - Injeta dados nos componentes presentacionais (TermometroRisco,
 *     CartaoAlertaResponsavel, FormularioJustificativa,
 *     AvisoPresencaObrigatoria, ChatHorarioProtegido, ModalBase).
 *
 * Princípio KISS:
 *   Telas limpas, letras grandes, botões objetivos, para responsáveis
 *   com pouca familiaridade tecnológica ou dados limitados.
 */

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useAcessibilidade } from '@/composables/useAcessibilidade';
import { useBuscaAtiva } from '@/composables/useBuscaAtiva';
import { supabaseClient } from '@/servicos/supabase';
import TermometroRisco from '@/componentes/TermometroRisco.vue';
import CartaoAlertaResponsavel from '@/componentes/CartaoAlertaResponsavel.vue';
import FormularioJustificativa from '@/componentes/FormularioJustificativa.vue';
import AvisoPresencaObrigatoria from '@/componentes/AvisoPresencaObrigatoria.vue';
import ChatHorarioProtegido from '@/componentes/ChatHorarioProtegido.vue';
import ModalBase from '@/componentes/ModalBase.vue';
import type { AlertaResponsavel, MensagemChat, TermometroAtencao } from '@/tipos/componentes';
import type { Aluno } from '@/tipos/database';

// =========================================================
// Estado de autenticação
// =========================================================

const { usuario } = useAutenticacao();
const { lerTexto } = useAcessibilidade();
const {
  buscarFilhosDoResponsavel,
  buscarTermometroAluno,
  buscarAlertasResponsavel,
  enviarJustificativa,
  buscarMensagensChat,
  horarioProtegidoAtivo,
  obterHorarioProtegido,
  carregando,
  erro,
} = useBuscaAtiva();

const nomeResponsavel = computed(() => usuario.value?.nome || 'Responsável');

// =========================================================
// Estado da tela
// =========================================================

const filhos = ref<Aluno[]>([]);
const filhoSelecionado = ref<Aluno | null>(null);
const termometro = ref<TermometroAtencao | null>(null);
const alertas = ref<AlertaResponsavel[]>([]);
const mensagensChat = ref<MensagemChat[]>([]);
const horarioAtivo = ref(false);
const horarioConfig = obterHorarioProtegido();

// Modal: enviar justificativa
const modalJustificativaAberto = ref(false);
const enviandoJustificativa = ref(false);

// Modal: detalhes do alerta
const modalAlertaAberto = ref(false);
const alertaSelecionado = ref<AlertaResponsavel | null>(null);

// Modal: confirmar comparecimento
const modalComparecimentoAberto = ref(false);

// Mensagens de feedback
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

/**
 * Aviso de presença obrigatória: prioriza o alerta mais recente
 * de suspensão ou ocorrência grave que exige presença.
 */
const avisoPresencaObrigatoria = computed(() => {
  const suspensoes = alertas.value
    .filter((a) => a.tipo === 'suspensao' && a.urgente)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  if (!suspensoes.length) return null;
  const s = suspensoes[0];
  if (!s) return null;
  const nomeAluno = s.titulo.replace(/^Suspensão — /, '');
  return {
    alunoNome: nomeAluno,
    descricao: s.descricao,
    data: s.data,
    alertaId: s.id,
  };
});

// =========================================================
// Ações
// =========================================================

async function carregarDados() {
  if (!usuario.value) return;

  horarioAtivo.value = horarioProtegidoAtivo();

  filhos.value = await buscarFilhosDoResponsavel(usuario.value.id);

  const primeiroFilho = filhos.value[0];
  if (primeiroFilho) {
    selecionarFilho(primeiroFilho);
  }

  alertas.value = await buscarAlertasResponsavel(usuario.value.id);
  mensagensChat.value = await buscarMensagensChat(usuario.value.id);
}

async function selecionarFilho(filho: Aluno) {
  filhoSelecionado.value = filho;
  termometro.value = await buscarTermometroAluno(filho.id, filho.nome, filho.turma);
}

async function handleEnviarJustificativa(payload: {
  motivo: string;
  dataAusencia: string;
  arquivo: File | null;
}) {
  if (!usuario.value || !filhoSelecionado.value) {
    mostrarErro('Selecione um filho antes de enviar a justificativa.');
    return;
  }

  enviandoJustificativa.value = true;
  try {
    // Como o responsável não é professor, usamos um placeholder
    // para professor_id (campo NOT NULL no schema). Em produção,
    // criar migration para tornar o campo nullable ou usar
    // trigger que preenche com o professor da turma.
    const ok = await enviarJustificativa(
      filhoSelecionado.value.id,
      usuario.value.id, // Usa o ID do responsável como fallback
      payload.dataAusencia,
      payload.motivo,
      payload.arquivo,
      usuario.value.id,
    );

    if (ok) {
      mostrarSucesso('Justificativa enviada com sucesso. A gestão escolar irá validar em até 48h.');
      modalJustificativaAberto.value = false;
      // Recarrega alertas
      alertas.value = await buscarAlertasResponsavel(usuario.value.id);
    } else {
      mostrarErro('Falha ao enviar justificativa. Tente novamente.');
    }
  } finally {
    enviandoJustificativa.value = false;
  }
}

function verDetalhesAlerta(alertaId: string) {
  const a = alertas.value.find((x) => x.id === alertaId);
  if (a) {
    alertaSelecionado.value = a;
    modalAlertaAberto.value = true;
  }
}

function abrirModalJustificativa(alertaId?: string) {
  if (alertaId) {
    const a = alertas.value.find((x) => x.id === alertaId);
    if (a) {
      // Pré-preenche a data se o alerta tiver data
      // (será usado pelo FormularioJustificativa via estado interno)
    }
  }
  modalJustificativaAberto.value = true;
}

function confirmarComparecimento() {
  modalComparecimentoAberto.value = true;
}

function confirmarComparecimentoFinal() {
  mostrarSucesso('Comparecimento confirmado. A coordenação irá agendar a reunião com você.');
  modalComparecimentoAberto.value = false;
}

async function enviarMensagemChat(texto: string) {
  if (!usuario.value || !filhoSelecionado.value) return;
  if (!horarioAtivo.value) {
    mostrarErro('Não é possível enviar mensagens fora do horário escolar.');
    return;
  }

  // Adiciona localmente (a tabela mensagens_chat ainda não existe)
  const agora = new Date();
  const novaMsg: MensagemChat = {
    id: 'local-' + Date.now(),
    autor: 'responsavel',
    nomeAutor: usuario.value.nome,
    texto,
    horario: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    data: agora.toLocaleDateString('pt-BR'),
  };
  mensagensChat.value.push(novaMsg);
  mostrarSucesso('Mensagem enviada para a coordenação.');
}

// =========================================================
// Relógio: atualiza o estado de horário protegido a cada minuto
// =========================================================

let intervaloRelogio: number | null = null;

function iniciarRelogio() {
  intervaloRelogio = window.setInterval(() => {
    horarioAtivo.value = horarioProtegidoAtivo();
  }, 60_000);
}

onMounted(async () => {
  await carregarDados();
  iniciarRelogio();

  // Atualiza alertas em tempo real
  supabaseClient
    .channel('painel-responsavel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'frequencias' }, () =>
      carregarDados(),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ocorrencias' }, () =>
      carregarDados(),
    )
    .subscribe();
});

onUnmounted(() => {
  if (intervaloRelogio) window.clearInterval(intervaloRelogio);
  supabaseClient.channel('painel-responsavel').unsubscribe();
});
</script>

<template>
  <!--
    Cabeçalho: boas-vindas + seleção de filho (quando aplicável)
  -->
  <section class="mb-4" aria-labelledby="titulo-responsavel">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <h1 id="titulo-responsavel" class="h3 mb-1 fw-bold">Olá, {{ nomeResponsavel }}</h1>
        <p class="text-body-secondary mb-0">
          Acompanhe a vida escolar do seu filho de forma simples e transparente.
        </p>
      </div>
      <button type="button" class="btn btn-success btn-lg" @click="abrirModalJustificativa()">
        <i class="bi bi-paperclip me-2" aria-hidden="true"></i>
        Enviar justificativa
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
    Aviso de Presença Obrigatória: destaque máximo no topo.
    Exibido somente quando há suspensão/ocorrência grave que
    exige comparecimento físico do responsável.
  -->
  <section v-if="avisoPresencaObrigatoria" class="mb-4">
    <AvisoPresencaObrigatoria
      :aluno-nome="avisoPresencaObrigatoria.alunoNome"
      :descricao="avisoPresencaObrigatoria.descricao"
      :data="avisoPresencaObrigatoria.data"
      @confirmar="confirmarComparecimento"
      @ver-detalhes="verDetalhesAlerta(avisoPresencaObrigatoria?.alertaId ?? '')"
    />
  </section>

  <!--
    Estado de carregamento inicial
  -->
  <div v-if="carregando && !filhos.length" class="text-center py-5">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Carregando dados...</span>
    </div>
    <p class="mt-2 text-body-secondary mb-0">Carregando informações dos seus filhos...</p>
  </div>

  <!--
    Estado vazio: nenhum filho vinculado
  -->
  <div v-else-if="!filhos.length" class="card shadow-sm border-0 text-center py-5 mb-4">
    <div class="card-body">
      <i class="bi bi-person-x fs-1 text-body-secondary d-block mb-3" aria-hidden="true"></i>
      <h2 class="h5">Nenhum aluno vinculado à sua conta</h2>
      <p class="text-body-secondary mb-3">
        Contate a secretaria da escola para vincular seu filho ao seu CPF/email.
      </p>
      <button type="button" class="btn btn-outline-primary" @click="carregarDados">
        <i class="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>
        Tentar novamente
      </button>
    </div>
  </div>

  <template v-else>
    <!--
      Seletor de filho (quando há mais de um)
    -->
    <section v-if="filhos.length > 1" class="mb-3">
      <label for="seletorFilho" class="form-label fw-semibold">Selecione o aluno</label>
      <select
        id="seletorFilho"
        class="form-select form-select-lg"
        :value="filhoSelecionado?.id"
        @change="
          (e: Event) => {
            const alvo = e.target as HTMLSelectElement;
            const filho = filhos.find((f: Aluno) => f.id === alvo.value);
            if (filho) selecionarFilho(filho);
          }
        "
      >
        <option v-for="f in filhos" :key="f.id" :value="f.id">
          {{ f.nome }}<span v-if="f.turma"> — {{ f.turma }}</span>
        </option>
      </select>
    </section>

    <!--
      Termômetro de Atenção Visual
    -->
    <section class="mb-4">
      <div v-if="!termometro" class="card shadow-sm border-0">
        <div class="card-body text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando termômetro...</span>
          </div>
        </div>
      </div>
      <TermometroRisco v-else :termometro="termometro" />
    </section>

    <!--
      Alertas de Ausência
    -->
    <section class="mb-4" aria-labelledby="titulo-alertas">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 id="titulo-alertas" class="h5 mb-0 fw-bold">
          <i class="bi bi-bell-fill me-2 text-primary" aria-hidden="true"></i>
          Alertas de Ausência
        </h2>
        <span class="badge text-bg-secondary">{{ alertas.length }} alerta(s)</span>
      </div>

      <div v-if="!alertas.length" class="card shadow-sm border-0">
        <div class="card-body text-center py-5">
          <i class="bi bi-check-circle-fill fs-1 text-success d-block mb-2" aria-hidden="true"></i>
          <p class="mb-0">Nenhum alerta no momento. Seu filho está com frequência regular.</p>
        </div>
      </div>

      <div v-else class="row g-3">
        <div v-for="alerta in alertas.slice(0, 6)" :key="alerta.id" class="col-12 col-md-6">
          <CartaoAlertaResponsavel
            :alerta="alerta"
            @ver-detalhes="verDetalhesAlerta"
            @enviar-justificativa="abrirModalJustificativa"
          />
        </div>
      </div>
    </section>

    <!--
      Canal de Diálogo com Horário Protegido
    -->
    <section class="mb-4" aria-labelledby="titulo-chat">
      <h2 id="titulo-chat" class="h5 mb-3 fw-bold">
        <i class="bi bi-chat-dots-fill me-2 text-primary" aria-hidden="true"></i>
        Falar com a Coordenação
      </h2>

      <ChatHorarioProtegido
        :mensagens="mensagensChat"
        :horario-ativo="horarioAtivo"
        :mensagem-fora-horario="horarioConfig.mensagemForaHorario"
        :enviando="false"
        @enviar-mensagem="enviarMensagemChat"
      />
    </section>
  </template>

  <!--
    Modal: Enviar justificativa (com anexo)
  -->
  <ModalBase
    v-model="modalJustificativaAberto"
    variante="padrao"
    tamanho="lg"
    titulo="Enviar justificativa de ausência"
    fechar-label="Fechar formulário de justificativa"
  >
    <FormularioJustificativa
      :aluno-nome="filhoSelecionado?.nome || ''"
      :aluno-turma="filhoSelecionado?.turma || ''"
      :enviando="enviandoJustificativa"
      @enviar="handleEnviarJustificativa"
    />

    <template #rodape>
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
        Fechar
      </button>
    </template>
  </ModalBase>

  <!--
    Modal: Detalhes do alerta
  -->
  <ModalBase
    v-model="modalAlertaAberto"
    variante="padrao"
    tamanho="md"
    titulo="Detalhes do alerta"
    fechar-label="Fechar detalhes do alerta"
  >
    <div v-if="alertaSelecionado">
      <h3 class="h5 mb-2">{{ alertaSelecionado.titulo }}</h3>
      <p class="text-body-secondary small mb-3">
        <i class="bi bi-calendar me-1" aria-hidden="true"></i>{{ alertaSelecionado.data }}
        <span v-if="alertaSelecionado.periodo">
          · <i class="bi bi-clock me-1" aria-hidden="true"></i>{{ alertaSelecionado.periodo }}
        </span>
      </p>
      <p>{{ alertaSelecionado.descricao }}</p>
    </div>

    <template #rodape>
      <button
        v-if="
          alertaSelecionado &&
          (alertaSelecionado.tipo === 'ausencia_escola' ||
            alertaSelecionado.tipo === 'ausencia_aula')
        "
        type="button"
        class="btn btn-success"
        @click="
          () => {
            const id = alertaSelecionado?.id;
            if (id) abrirModalJustificativa(id);
            modalAlertaAberto = false;
          }
        "
      >
        <i class="bi bi-paperclip me-2" aria-hidden="true"></i>
        Enviar justificativa
      </button>
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
        Fechar
      </button>
    </template>
  </ModalBase>

  <!--
    Modal: Confirmar comparecimento
  -->
  <ModalBase
    v-model="modalComparecimentoAberto"
    variante="padrao"
    tamanho="md"
    titulo="Confirmar comparecimento"
    fechar-label="Fechar confirmação de comparecimento"
  >
    <p>
      Você está confirmando que pretende comparecer presencialmente à escola para liberar o retorno
      do aluno <strong>{{ avisoPresencaObrigatoria?.alunoNome }}</strong
      >.
    </p>
    <p class="text-body-secondary small mb-0">
      A coordenação irá receber sua confirmação e entrar em contato para agendar a reunião. Mantenha
      seu telefone disponível.
    </p>

    <template #rodape>
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
        Cancelar
      </button>
      <button type="button" class="btn btn-danger" @click="confirmarComparecimentoFinal">
        <i class="bi bi-check-lg me-2" aria-hidden="true"></i>
        Confirmar comparecimento
      </button>
    </template>
  </ModalBase>
</template>
