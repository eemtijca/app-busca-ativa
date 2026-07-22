<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { supabaseClient } from '@/servicos/supabase';
import CampoFormulario from '@/componentes/CampoFormulario.vue';
import type { Disciplina } from '@/tipos/database';

const router = useRouter();

const disciplinas = ref<Disciplina[]>([]);
const carregando = ref(false);
const mensagemSucesso = ref<string | null>(null);
const mensagemErro = ref<string | null>(null);

const modalAberto = ref(false);
const modoEdicao = ref(false);
const editandoId = ref<string | null>(null);

const formNome = ref('');
const formCodigoSige = ref('');
const formCargaHoraria = ref<number | null>(null);
const formAtivo = ref(true);
const formDirty = ref(false);

onBeforeRouteLeave((_to, _from, next) => {
  if (formDirty.value && modalAberto.value && !carregando.value) {
    const confirmar = window.confirm('Há alterações não salvas. Deseja realmente sair?');
    if (!confirmar) return next(false);
  }
  next();
});

watch(
  [formNome, formCodigoSige, formCargaHoraria, formAtivo],
  () => { if (!formDirty.value && modalAberto.value) formDirty.value = true; },
);

function mostrarSucesso(msg: string) {
  mensagemSucesso.value = msg;
  setTimeout(() => (mensagemSucesso.value = null), 4000);
}

function mostrarErro(msg: string) {
  mensagemErro.value = msg;
  setTimeout(() => (mensagemErro.value = null), 4000);
}

function resetForm() {
  formNome.value = '';
  formCodigoSige.value = '';
  formCargaHoraria.value = null;
  formAtivo.value = true;
  formDirty.value = false;
  editandoId.value = null;
  modoEdicao.value = false;
}

async function carregarDisciplinas() {
  carregando.value = true;
  try {
    const { data } = await supabaseClient.from('disciplinas').select('*').order('nome');
    disciplinas.value = data ?? [];
  } catch {
    mostrarErro('Falha ao carregar disciplinas.');
  } finally {
    carregando.value = false;
  }
}

async function abrirEditar(disciplina: Disciplina) {
  modoEdicao.value = true;
  editandoId.value = disciplina.id;
  formNome.value = disciplina.nome;
  formCodigoSige.value = disciplina.codigo_sige ?? '';
  formCargaHoraria.value = disciplina.carga_horaria;
  formAtivo.value = disciplina.ativo;
  modalAberto.value = true;
}

function abrirNovo() {
  resetForm();
  modalAberto.value = true;
}

async function salvar() {
  document.querySelector('.modal-body')?.scrollTo({ top: 0, behavior: 'smooth' });
  if (!formNome.value.trim()) {
    mostrarErro('O campo nome é obrigatório.');
    return;
  }
  carregando.value = true;
  try {
    if (modoEdicao.value && editandoId.value) {
      const { error } = await supabaseClient
        .from('disciplinas')
        .update({
          nome: formNome.value.trim(),
          codigo_sige: formCodigoSige.value.trim() || null,
          carga_horaria: formCargaHoraria.value,
          ativo: formAtivo.value,
        })
        .eq('id', editandoId.value);
      if (error) {
        mostrarErro('Falha ao atualizar disciplina.');
        return;
      }
      mostrarSucesso('Disciplina atualizada.');
    } else {
      const { error } = await supabaseClient.from('disciplinas').insert({
        nome: formNome.value.trim(),
        codigo_sige: formCodigoSige.value.trim() || null,
        carga_horaria: formCargaHoraria.value,
        ativo: formAtivo.value,
      });
      if (error) {
        mostrarErro('Falha ao criar disciplina.');
        return;
      }
      mostrarSucesso('Disciplina criada.');
    }
    modalAberto.value = false;
    resetForm();
    await carregarDisciplinas();
  } finally {
    carregando.value = false;
  }
}

async function alternarAtivo(disciplina: Disciplina) {
  const novoValor = !disciplina.ativo;
  const { error } = await supabaseClient
    .from('disciplinas')
    .update({ ativo: novoValor })
    .eq('id', disciplina.id);
  if (!error) {
    disciplina.ativo = novoValor;
    mostrarSucesso(novoValor ? 'Disciplina ativada.' : 'Disciplina desativada.');
  } else {
    mostrarErro('Falha ao alterar status.');
  }
}

onMounted(carregarDisciplinas);
</script>

<template>
  <div class="container py-4" style="max-width: 960px">
    <router-link to="/gestao" class="btn btn-sm btn-outline-success me-2 mb-3">
      <i class="bi bi-house me-1" aria-hidden="true"></i>
      Início
    </router-link>
    <button type="button" class="btn btn-sm btn-outline-secondary mb-3" @click="router.back()">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
      Voltar
    </button>

    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h5 fw-bold mb-0">
        <i class="bi bi-bookmark-star text-success me-2" aria-hidden="true"></i>
        Disciplinas
      </h1>
      <button type="button" class="btn btn-sm btn-success" @click="abrirNovo">
        <i class="bi bi-plus-lg me-1" aria-hidden="true"></i>
        Nova disciplina
      </button>
    </div>

    <div v-if="mensagemSucesso" class="alert alert-success py-2 small mb-3" role="status">
      <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
      {{ mensagemSucesso }}
    </div>
    <div v-if="mensagemErro" class="alert alert-danger py-2 small mb-3" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      {{ mensagemErro }}
    </div>

    <div v-if="carregando && !disciplinas.length" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Carregando...</span>
      </div>
      <p class="mt-2 text-body-secondary small mb-0">Carregando disciplinas...</p>
    </div>

    <div v-else-if="!disciplinas.length" class="text-center py-5 text-body-secondary">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-circle bg-body-tertiary mb-3"
        style="width: 72px; height: 72px"
      >
        <i class="bi bi-bookmark-star fs-4 opacity-50" aria-hidden="true"></i>
      </span>
      <p class="mb-0 small">Nenhuma disciplina cadastrada.</p>
    </div>

    <div v-else class="card border">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 small">
          <thead class="table-light">
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Código SIGE</th>
              <th scope="col">Carga horária</th>
              <th scope="col">Status</th>
              <th scope="col" class="text-end">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="disciplina in disciplinas" :key="disciplina.id">
              <td class="fw-medium">{{ disciplina.nome }}</td>
              <td class="text-body-secondary">{{ disciplina.codigo_sige ?? '—' }}</td>
              <td>{{ disciplina.carga_horaria ?? '—' }}</td>
              <td>
                <span
                  class="badge"
                  :class="disciplina.ativo ? 'text-bg-success' : 'text-bg-secondary'"
                >
                  {{ disciplina.ativo ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="text-end">
                <div class="d-flex gap-1 justify-content-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-success"
                    @click="abrirEditar(disciplina)"
                  >
                    <i class="bi bi-pencil" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="disciplina.ativo ? 'btn-outline-danger' : 'btn-outline-success'"
                    :title="disciplina.ativo ? 'Desativar' : 'Ativar'"
                    @click="alternarAtivo(disciplina)"
                  >
                    <i
                      :class="disciplina.ativo ? 'bi bi-pause-circle' : 'bi bi-play-circle'"
                      aria-hidden="true"
                    ></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
              <i class="bi bi-bookmark-star text-primary me-1" aria-hidden="true"></i>
              {{ modoEdicao ? 'Editar disciplina' : 'Nova disciplina' }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="modalAberto = false"
              aria-label="Fechar"
            ></button>
          </div>
          <form @submit.prevent="salvar">
            <div class="modal-body">
              <CampoFormulario id="campoNome" label="Nome" :obrigatorio="true">
                <input
                  id="campoNome"
                  v-model="formNome"
                  type="text"
                  class="form-control form-control-sm"
                  required
                  autocomplete="off"
                />
              </CampoFormulario>
              <CampoFormulario id="campoCodigoSige" label="Código SIGE">
                <input
                  id="campoCodigoSige"
                  v-model="formCodigoSige"
                  type="text"
                  class="form-control form-control-sm"
                  autocomplete="off"
                />
              </CampoFormulario>
              <CampoFormulario id="campoCargaHoraria" label="Carga horária">
                <input
                  id="campoCargaHoraria"
                  v-model.number="formCargaHoraria"
                  type="number"
                  min="0"
                  class="form-control form-control-sm"
                  autocomplete="off"
                />
              </CampoFormulario>
              <div class="mb-0">
                <div class="form-check">
                  <input
                    id="campoAtivo"
                    v-model="formAtivo"
                    type="checkbox"
                    class="form-check-input"
                  />
                  <label class="form-check-label small fw-medium" for="campoAtivo">Ativo</label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="modalAberto = false"
              >
                Cancelar
              </button>
              <button type="submit" class="btn btn-sm btn-success" :disabled="carregando">
                <span
                  v-if="carregando"
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                <i v-else class="bi bi-check-lg me-1" aria-hidden="true"></i>
                {{ modoEdicao ? 'Salvar' : 'Criar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
