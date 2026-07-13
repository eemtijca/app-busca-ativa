<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGestaoUsuarios } from '@/composables/useGestaoUsuarios';
import { supabaseClient } from '@/servicos/supabase';
import type { SolicitacaoCodigo, CodigoGerado } from '@/tipos/componentes';

const router = useRouter();
const {
  buscarNotificacoesCodigos,
  gerarCodigoRedefinicao,
  buscarCodigosGerados,
  marcarNotificacaoLida,
  carregando,
  erro,
} = useGestaoUsuarios();

const solicitacoes = ref<SolicitacaoCodigo[]>([]);
const codigosGerados = ref<CodigoGerado[]>([]);
const mensagemSucesso = ref<string | null>(null);
const mensagemErro = ref<string | null>(null);

const modalAberto = ref(false);
const codigoAtual = ref('');
const solicitacaoAtual = ref<SolicitacaoCodigo | null>(null);

const codigosVisiveis = ref<Set<string>>(new Set());
const guiaAtiva = ref<'pendentes' | 'recentes'>('pendentes');

let canalNotificacoes: ReturnType<typeof supabaseClient.channel>;
let canalCodigos: ReturnType<typeof supabaseClient.channel>;

function mostrarSucesso(msg: string) {
  mensagemSucesso.value = msg;
  setTimeout(() => (mensagemSucesso.value = null), 4000);
}

function mostrarErro(msg: string) {
  mensagemErro.value = msg;
  setTimeout(() => (mensagemErro.value = null), 4000);
}

const papelLabel = (papel: string) => {
  const map: Record<string, string> = {
    professor: 'Professor',
    responsavel: 'Responsável',
    gestao: 'Gestão',
  };
  return map[papel] ?? papel;
};

const papelBadge = (papel: string) => {
  const map: Record<string, string> = {
    professor: 'primary',
    responsavel: 'success',
    gestao: 'dark',
  };
  return map[papel] ?? 'secondary';
};

const codigoStatusBadge = (status: string) => {
  const map: Record<string, string> = { ativo: 'success', usado: 'secondary', expirado: 'warning' };
  return map[status] ?? 'secondary';
};

function formatarData(data: string) {
  return new Date(data).toLocaleString('pt-BR');
}

function toggleVisibilidade(codigoId: string) {
  const novo = new Set(codigosVisiveis.value);
  if (novo.has(codigoId)) novo.delete(codigoId);
  else novo.add(codigoId);
  codigosVisiveis.value = novo;
}

async function gerarCodigo(solicitacao: SolicitacaoCodigo) {
  const codigo = await gerarCodigoRedefinicao(solicitacao.perfil_id);
  if (codigo) {
    codigoAtual.value = codigo;
    solicitacaoAtual.value = solicitacao;
    modalAberto.value = true;
    await marcarNotificacaoLida(solicitacao.id);
    solicitacoes.value = solicitacoes.value.filter((s) => s.id !== solicitacao.id);
    codigosGerados.value = await buscarCodigosGerados();
  } else {
    mostrarErro(erro.value || 'Falha ao gerar código.');
  }
}

function copiarCodigo() {
  navigator.clipboard.writeText(codigoAtual.value).then(() => {
    mostrarSucesso('Código copiado!');
  });
}

function abrirWhatsApp() {
  if (!solicitacaoAtual.value) return;
  const texto = `Seu código de acesso é: ${codigoAtual.value}`;
  const telefone = '';
  const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank', 'noopener');
}

async function carregarDados() {
  solicitacoes.value = await buscarNotificacoesCodigos();
  codigosGerados.value = await buscarCodigosGerados();
}

onMounted(async () => {
  await carregarDados();
  canalNotificacoes = supabaseClient
    .channel('codigos-notificacoes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes' }, () =>
      buscarNotificacoesCodigos().then((r) => (solicitacoes.value = r)),
    )
    .subscribe();
  canalCodigos = supabaseClient
    .channel('codigos-redefinicao')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'codigos_redefinicao' }, () =>
      buscarCodigosGerados().then((r) => (codigosGerados.value = r)),
    )
    .subscribe();
});

onUnmounted(() => {
  if (canalNotificacoes) supabaseClient.removeChannel(canalNotificacoes);
  if (canalCodigos) supabaseClient.removeChannel(canalCodigos);
});
</script>

<template>
  <div class="container py-4" style="max-width: 960px">
    <router-link to="/gestao" class="btn btn-sm btn-outline-primary me-2 mb-3">
      <i class="bi bi-house me-1" aria-hidden="true"></i>
      Início
    </router-link>
    <button type="button" class="btn btn-sm btn-outline-secondary mb-3" @click="router.back()">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
      Voltar
    </button>

    <h1 class="h5 fw-bold mb-3">
      <i class="bi bi-key text-warning me-2" aria-hidden="true"></i>
      Códigos de acesso
    </h1>

    <div v-if="mensagemSucesso" class="alert alert-success py-2 small mb-3" role="status">
      <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
      {{ mensagemSucesso }}
    </div>
    <div v-if="mensagemErro" class="alert alert-danger py-2 small mb-3" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      {{ mensagemErro }}
    </div>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button
          type="button"
          class="nav-link small"
          :class="{ active: guiaAtiva === 'pendentes' }"
          @click="guiaAtiva = 'pendentes'"
        >
          Solicitações pendentes
          <span v-if="solicitacoes.length" class="badge text-bg-warning ms-1">{{
            solicitacoes.length
          }}</span>
        </button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link small"
          :class="{ active: guiaAtiva === 'recentes' }"
          @click="guiaAtiva = 'recentes'"
        >
          Códigos recentes
        </button>
      </li>
    </ul>

    <div v-if="guiaAtiva === 'pendentes'">
      <div v-if="carregando && !solicitacoes.length" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <p class="mt-2 text-body-secondary small mb-0">Carregando solicitações...</p>
      </div>

      <div v-else-if="!solicitacoes.length" class="text-center py-5 text-body-secondary">
        <span
          class="d-inline-flex align-items-center justify-content-center rounded-circle bg-body-tertiary mb-3"
          style="width: 72px; height: 72px"
        >
          <i class="bi bi-check2-all fs-4 opacity-50" aria-hidden="true"></i>
        </span>
        <p class="mb-0 small">Nenhuma solicitação pendente.</p>
      </div>

      <div v-else class="d-flex flex-column gap-2">
        <div v-for="s in solicitacoes" :key="s.id" class="card border">
          <div class="card-body py-3">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <p class="fw-medium mb-1 small">{{ s.nome }}</p>
                <p class="text-body-secondary mb-1 small">{{ s.email }}</p>
                <div class="d-flex gap-2 align-items-center">
                  <span class="badge" :class="'text-bg-' + papelBadge(s.papel)">
                    {{ papelLabel(s.papel) }}
                  </span>
                  <span class="text-body-tertiary small">{{ formatarData(s.criado_em) }}</span>
                </div>
              </div>
              <button
                type="button"
                class="btn btn-sm btn-warning"
                :disabled="carregando"
                @click="gerarCodigo(s)"
              >
                <i class="bi bi-key me-1" aria-hidden="true"></i>
                Gerar código
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else>
      <div v-if="carregando && !codigosGerados.length" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <p class="mt-2 text-body-secondary small mb-0">Carregando códigos...</p>
      </div>

      <div v-else-if="!codigosGerados.length" class="text-center py-5 text-body-secondary">
        <span
          class="d-inline-flex align-items-center justify-content-center rounded-circle bg-body-tertiary mb-3"
          style="width: 72px; height: 72px"
        >
          <i class="bi bi-clock-history fs-4 opacity-50" aria-hidden="true"></i>
        </span>
        <p class="mb-0 small">Nenhum código gerado ainda.</p>
      </div>

      <div v-else class="card border">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Código</th>
                <th scope="col">Status</th>
                <th scope="col">Criado por</th>
                <th scope="col">Expira em</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in codigosGerados" :key="c.id">
                <td class="fw-medium">{{ c.nome }}</td>
                <td class="text-body-secondary">{{ c.email }}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <code v-if="codigosVisiveis.has(c.id)" class="user-select-all">{{
                      c.codigo
                    }}</code>
                    <span v-else class="text-body-tertiary">••••••</span>
                    <button
                      type="button"
                      class="btn btn-sm btn-link p-0 text-body-secondary"
                      :title="codigosVisiveis.has(c.id) ? 'Ocultar' : 'Mostrar'"
                      @click="toggleVisibilidade(c.id)"
                    >
                      <i
                        :class="codigosVisiveis.has(c.id) ? 'bi bi-eye-slash' : 'bi bi-eye'"
                        aria-hidden="true"
                      ></i>
                    </button>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="'text-bg-' + codigoStatusBadge(c.status)">
                    {{ c.status }}
                  </span>
                </td>
                <td class="text-body-secondary">{{ c.criado_por_nome ?? '—' }}</td>
                <td class="text-body-secondary">{{ formatarData(c.expira_em) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div
      v-if="modalAberto"
      class="modal d-block"
      tabindex="-1"
      style="background-color: rgba(0, 0, 0, 0.5)"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title small fw-bold">
              <i class="bi bi-key text-warning me-1" aria-hidden="true"></i>
              Código gerado
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="modalAberto = false"
              aria-label="Fechar"
            ></button>
          </div>
          <div class="modal-body text-center py-4">
            <p class="small text-body-secondary mb-2">
              Código de acesso para {{ solicitacaoAtual?.nome }}
            </p>
            <code
              class="d-inline-block fs-1 fw-bold font-monospace bg-body-tertiary px-3 py-2 rounded user-select-all"
              style="letter-spacing: 0.15em"
            >
              {{ codigoAtual }}
            </code>
            <div class="d-flex gap-2 justify-content-center mt-3">
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="copiarCodigo">
                <i class="bi bi-clipboard me-1" aria-hidden="true"></i>
                Copiar
              </button>
              <button type="button" class="btn btn-sm btn-success" @click="abrirWhatsApp">
                <i class="bi bi-whatsapp me-1" aria-hidden="true"></i>
                Enviar via WhatsApp
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-sm btn-primary" @click="modalAberto = false">
              Concluído
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
