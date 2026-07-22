<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGestaoUsuarios } from '@/composables/useGestaoUsuarios';
import { supabaseClient } from '@/servicos/supabase';
import type {
  PapelPerfil,
  StatusPerfil,
  AtribuicaoProfessor,
  VinculoResponsavel,
} from '@/tipos/database';

const route = useRoute();
const router = useRouter();
const { buscarUsuarios, criarUsuario, atualizarUsuario, carregando, erro } = useGestaoUsuarios();

const modoEdicao = ref(false);
const usuarioId = ref<string | null>(null);

const nome = ref('');
const email = ref('');
const papel = ref<PapelPerfil>('professor');
const telefone = ref('');
const cargo = ref('');
const status = ref<StatusPerfil>('ativo');
const notificacoesAtivas = ref(true);

// Atribuições (professor)
const atribuicoes = ref<(AtribuicaoProfessor & { turma_nome?: string })[]>([]);

// Vínculos (responsável)
const vinculos = ref<(VinculoResponsavel & { aluno_nome?: string })[]>([]);

const salvando = ref(false);
const mensagemSucesso = ref<string | null>(null);
const mensagemErro = ref<string | null>(null);
const mensagemToast = ref<string | null>(null);
const usuarioCriado = ref(false);
const codigoCriado = ref<string | null>(null);

function mostrarErro(msg: string) {
  mensagemErro.value = msg;
  setTimeout(() => (mensagemErro.value = null), 4000);
}

async function copiarCodigoCriado() {
  if (!codigoCriado.value) return;
  try {
    await navigator.clipboard.writeText(codigoCriado.value);
  } catch {
    const el = document.createElement('textarea');
    el.value = codigoCriado.value;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
  mensagemToast.value = 'Código copiado!';
  setTimeout(() => (mensagemToast.value = null), 2000);
}

onMounted(async () => {
  const id = route.params.id as string | undefined;
  if (id) {
    modoEdicao.value = true;
    usuarioId.value = id;
    const usuarios = await buscarUsuarios();
    const usuario = usuarios.find((u) => u.id === id);
    if (usuario) {
      nome.value = usuario.nome;
      email.value = usuario.email ?? '';
      papel.value = usuario.papel;
      telefone.value = usuario.telefone ?? '';
      cargo.value = usuario.cargo ?? '';
      status.value = usuario.status;
    } else {
      mostrarErro('Usuário não encontrado.');
      return;
    }
    const { data: perfil } = await supabaseClient
      .from('perfis')
      .select('notificacoes_ativas')
      .eq('id', id)
      .single();
    if (perfil) {
      notificacoesAtivas.value = perfil.notificacoes_ativas;
    }
    if (usuario.papel === 'professor') {
      const { data: atribs } = await supabaseClient
        .from('atribuicoes_professores')
        .select('*, turmas!atribuicoes_professores_turma_id_fkey(nome_completo)')
        .eq('professor_id', id)
        .order('created_at', { ascending: false });
      if (atribs) {
        atribuicoes.value = atribs.map((a: Record<string, unknown>) => ({
          ...a,
          turma_nome: (a.turmas as Record<string, string> | null)?.nome_completo ?? '—',
        })) as (AtribuicaoProfessor & { turma_nome?: string })[];
      }
    }
    if (usuario.papel === 'responsavel') {
      const { data: vincs } = await supabaseClient
        .from('vinculos_responsaveis')
        .select('*, alunos!vinculos_responsaveis_aluno_id_fkey(nome)')
        .eq('responsavel_id', id)
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      if (vincs) {
        vinculos.value = vincs.map((v: Record<string, unknown>) => ({
          ...v,
          aluno_nome: (v.alunos as Record<string, string> | null)?.nome ?? '—',
        })) as (VinculoResponsavel & { aluno_nome?: string })[];
      }
    }
  }
});

async function salvar() {
  if (!nome.value.trim()) {
    mostrarErro('O campo nome é obrigatório.');
    return;
  }
  if (!email.value.trim()) {
    mostrarErro('O campo e-mail é obrigatório.');
    return;
  }
  salvando.value = true;
  try {
    if (modoEdicao.value && usuarioId.value) {
      const ok = await atualizarUsuario(usuarioId.value, {
        nome: nome.value.trim(),
        telefone: telefone.value.trim() || undefined,
        cargo: cargo.value.trim() || undefined,
        status: status.value,
        notificacoes_ativas: notificacoesAtivas.value,
      } as Parameters<typeof atualizarUsuario>[1] & { notificacoes_ativas?: boolean });
      if (ok) {
        router.push('/gestao/usuarios');
      } else {
        mostrarErro(erro.value || 'Falha ao atualizar usuário.');
      }
    } else {
      const { id, codigo } = await criarUsuario({
        nome: nome.value.trim(),
        email: email.value.trim(),
        papel: papel.value,
        telefone: telefone.value.trim() || undefined,
        cargo: cargo.value.trim() || undefined,
      });
      if (id) {
        if (!notificacoesAtivas.value) {
          await supabaseClient.from('perfis').update({ notificacoes_ativas: false }).eq('id', id);
        }
        usuarioCriado.value = true;
        codigoCriado.value = codigo;
        if (codigo) {
          mensagemSucesso.value =
            'Usuário criado com sucesso! Código gerado automaticamente.';
        } else {
          mensagemSucesso.value =
            'Usuário criado com sucesso! A senha inicial deve ser redefinida via código.';
        }
      } else {
        mostrarErro(erro.value || 'Falha ao criar usuário.');
      }
    }
  } finally {
    salvando.value = false;
  }
}
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
      <i
        :class="'bi bi-' + (modoEdicao ? 'pencil' : 'person-plus') + ' text-primary me-2'"
        aria-hidden="true"
      ></i>
      {{ modoEdicao ? 'Editar usuário' : 'Novo usuário' }}
    </h1>

    <div v-if="mensagemSucesso" class="alert alert-success py-2 small mb-3" role="status">
      <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
      {{ mensagemSucesso }}
    </div>
    <div v-if="mensagemErro" class="alert alert-danger py-2 small mb-3" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      {{ mensagemErro }}
    </div>

    <div
      v-if="mensagemToast"
      class="position-fixed bottom-0 start-50 translate-middle-x mb-4"
      style="z-index: 1060"
    >
      <div class="bg-dark text-white small px-3 py-2 rounded-pill shadow">
        <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
        {{ mensagemToast }}
      </div>
    </div>

    <div v-if="usuarioCriado" class="text-center py-4">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success mb-3"
        style="width: 72px; height: 72px; font-size: 2rem"
      >
        <i class="bi bi-check-lg" aria-hidden="true"></i>
      </span>
      <p class="mb-3">{{ mensagemSucesso }}</p>

      <template v-if="codigoCriado">
        <p class="small text-body-secondary mb-2">
          Compartilhe o código com {{ nome }} para redefinir a senha.
        </p>
        <code
          class="d-inline-block fs-1 fw-bold font-monospace text-success bg-body-tertiary px-3 py-2 rounded user-select-all mb-3"
          style="letter-spacing: 0.15em"
        >
          {{ codigoCriado }}
        </code>
        <div class="d-flex gap-2 justify-content-center mb-3">
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="copiarCodigoCriado">
            <i class="bi bi-clipboard me-1" aria-hidden="true"></i>
            Copiar
          </button>
        </div>
      </template>
      <template v-else>
        <p class="small text-body-secondary mb-3">
          Acesse a tela de códigos para gerar um código de acesso.
        </p>
        <router-link to="/gestao/codigos" class="btn btn-primary mb-3">
          <i class="bi bi-key me-1" aria-hidden="true"></i>
          Ir para códigos
        </router-link>
      </template>

      <div>
        <router-link to="/gestao/usuarios" class="btn btn-outline-secondary">
          <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
          Voltar para lista
        </router-link>
      </div>
    </div>

    <form v-else @submit.prevent="salvar">
      <div class="card border mb-3">
        <div class="card-header bg-body-tertiary py-2">
          <span class="fw-medium small">Dados do usuário</span>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label for="campoNome" class="form-label small fw-medium">Nome</label>
            <input
              id="campoNome"
              v-model="nome"
              type="text"
              class="form-control form-control-sm"
              required
              autocomplete="off"
            />
          </div>
          <div class="mb-3">
            <label for="campoEmail" class="form-label small fw-medium">E-mail</label>
            <input
              id="campoEmail"
              v-model="email"
              type="email"
              class="form-control form-control-sm"
              :disabled="modoEdicao"
              required
              autocomplete="off"
            />
          </div>
          <div class="mb-3">
            <label for="campoPapel" class="form-label small fw-medium">Papel</label>
            <select
              id="campoPapel"
              v-model="papel"
              class="form-select form-select-sm"
              :disabled="modoEdicao"
            >
              <option value="professor">Professor</option>
              <option value="responsavel">Responsável</option>
            </select>
          </div>
          <div class="mb-3">
            <label for="campoTelefone" class="form-label small fw-medium">Telefone</label>
            <input
              id="campoTelefone"
              v-model="telefone"
              type="text"
              class="form-control form-control-sm"
              autocomplete="off"
            />
          </div>
          <div v-if="papel === 'professor'" class="mb-3">
            <label for="campoCargo" class="form-label small fw-medium">Cargo</label>
            <input
              id="campoCargo"
              v-model="cargo"
              type="text"
              class="form-control form-control-sm"
              autocomplete="off"
            />
          </div>
          <div class="mb-0">
            <div class="form-check">
              <input
                id="campoNotificacoes"
                v-model="notificacoesAtivas"
                type="checkbox"
                class="form-check-input"
              />
              <label class="form-check-label small fw-medium" for="campoNotificacoes"
                >Notificações ativas</label
              >
            </div>
          </div>
          <div v-if="modoEdicao" class="mt-3 mb-0">
            <label for="campoStatus" class="form-label small fw-medium">Status</label>
            <select id="campoStatus" v-model="status" class="form-select form-select-sm">
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      <div
        v-if="modoEdicao && papel === 'professor' && atribuicoes.length"
        class="card border mb-3"
      >
        <div class="card-header bg-body-tertiary py-2">
          <span class="fw-medium small">Atribuições</span>
        </div>
        <div class="card-body">
          <div
            v-for="a in atribuicoes"
            :key="a.id"
            class="border rounded p-2 mb-2 small bg-body-tertiary"
          >
            <div class="fw-medium">{{ a.turma_nome }}</div>
            <div class="d-flex gap-2 mt-1">
              <span
                class="badge"
                :class="a.papel === 'titular' ? 'text-bg-primary' : 'text-bg-info'"
              >
                {{ a.papel === 'titular' ? 'Titular' : 'Substituto' }}
              </span>
              <span v-if="a.ativo" class="badge text-bg-success">Ativo</span>
              <span v-else class="badge text-bg-secondary">Inativo</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="modoEdicao && papel === 'responsavel' && vinculos.length" class="card border mb-3">
        <div class="card-header bg-body-tertiary py-2">
          <span class="fw-medium small">Vínculos</span>
        </div>
        <div class="card-body">
          <div
            v-for="v in vinculos"
            :key="v.id"
            class="border rounded p-2 mb-2 small bg-body-tertiary"
          >
            <div class="fw-medium">{{ v.aluno_nome }}</div>
            <div class="d-flex gap-2 mt-1">
              <span class="badge text-bg-secondary">{{ v.tipo_relacao }}</span>
              <span v-if="v.contato_prioritario" class="badge text-bg-warning"
                >Contato prioritário</span
              >
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary" :disabled="salvando || carregando">
          <span
            v-if="salvando"
            class="spinner-border spinner-border-sm me-1"
            role="status"
            aria-hidden="true"
          ></span>
          <i v-else class="bi bi-check-lg me-1" aria-hidden="true"></i>
          {{ modoEdicao ? 'Salvar alterações' : 'Criar usuário' }}
        </button>
        <router-link to="/gestao/usuarios" class="btn btn-sm btn-outline-secondary"
          >Cancelar</router-link
        >
      </div>
    </form>
  </div>
</template>
