<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGestaoUsuarios } from '@/composables/useGestaoUsuarios';
import { supabaseClient } from '@/servicos/supabase';
import type { Turma, Enturmacao, VinculoResponsavel } from '@/tipos/database';

const route = useRoute();
const router = useRouter();
const { buscarAlunos, buscarTurmas, criarAluno, atualizarAluno, carregando, erro } =
  useGestaoUsuarios();

const modoEdicao = ref(false);
const alunoId = ref<string | null>(null);

const nome = ref('');
const matricula = ref('');
const codigoInep = ref('');
const dataNascimento = ref('');
const dataMatricula = ref('');
const observacoes = ref('');
const status = ref('ativo');
const turmaId = ref('');
const turmas = ref<Turma[]>([]);

const vinculoTipo = ref<'existente' | 'novo'>('existente');
const responsavelEmail = ref('');
const responsavelNome = ref('');
const responsavelTelefone = ref('');
const tipoVinculo = ref('outro');

const salvando = ref(false);
const mensagemErro = ref<string | null>(null);

// Enturmação atual (edit mode)
const enturmacaoAtual = ref<Enturmacao | null>(null);
const turmaAtualNome = ref('');

// Alterar enturmação
const alterarEnturmacao = ref(false);
const novaTurmaId = ref('');
const novaDataMatricula = ref('');

// Responsáveis vinculados
const vinculos = ref<
  (VinculoResponsavel & { responsavel_nome?: string; responsavel_email?: string })[]
>([]);
const adicionarResponsavel = ref(false);
const novoRespTipo = ref<'existente' | 'novo'>('existente');
const novoRespEmail = ref('');
const novoRespNome = ref('');
const novoRespTelefone = ref('');
const novoTipoVinculo = ref('outro');

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function mostrarErro(msg: string) {
  mensagemErro.value = msg;
  setTimeout(() => (mensagemErro.value = null), 4000);
}

async function carregarEnturmacao() {
  if (!alunoId.value) return;
  const { data: enturmacoes } = await supabaseClient
    .from('enturmacoes')
    .select('*, turmas!enturmacoes_turma_id_fkey(nome_completo)')
    .eq('aluno_id', alunoId.value)
    .eq('status', 'matriculado')
    .order('created_at', { ascending: false })
    .limit(1);
  if (enturmacoes && enturmacoes.length > 0) {
    enturmacaoAtual.value = enturmacoes[0] as unknown as Enturmacao;
    turmaAtualNome.value =
      ((enturmacoes[0] as Record<string, unknown>).turmas as Record<string, string> | null)
        ?.nome_completo ?? '';
  }
}

async function carregarVinculos() {
  if (!alunoId.value) return;
  const { data: vinculosData } = await supabaseClient
    .from('vinculos_responsaveis')
    .select('*, perfis!vinculos_responsaveis_responsavel_id_fkey(nome, email)')
    .eq('aluno_id', alunoId.value)
    .eq('ativo', true);
  if (vinculosData) {
    vinculos.value = vinculosData.map((v: Record<string, unknown>) => ({
      ...v,
      responsavel_nome: (v.perfis as Record<string, string> | null)?.nome ?? '—',
      responsavel_email: (v.perfis as Record<string, string> | null)?.email ?? '—',
    })) as unknown as (VinculoResponsavel & {
      responsavel_nome?: string;
      responsavel_email?: string;
    })[];
  }
}

async function salvarAlterarEnturmacao() {
  if (!novaTurmaId.value || !novaDataMatricula.value || !alunoId.value) {
    mostrarErro('Selecione a turma e a data de matrícula.');
    return;
  }
  salvando.value = true;
  try {
    if (enturmacaoAtual.value) {
      await supabaseClient
        .from('enturmacoes')
        .update({ status: 'transferido', data_encerramento: hoje() })
        .eq('id', enturmacaoAtual.value.id);
    }
    const { data: anos } = await supabaseClient
      .from('anos_letivos')
      .select('id')
      .eq('status', 'ativo')
      .limit(1);
    const anoLetivoId = anos?.[0]?.id;
    if (!anoLetivoId) {
      mostrarErro('Nenhum ano letivo ativo encontrado.');
      return;
    }
    const { error } = await supabaseClient.from('enturmacoes').insert({
      aluno_id: alunoId.value,
      turma_id: novaTurmaId.value,
      ano_letivo_id: anoLetivoId,
      status: 'matriculado',
      data_matricula: novaDataMatricula.value,
    });
    if (error) {
      mostrarErro('Falha ao alterar enturmação.');
      return;
    }
    alterarEnturmacao.value = false;
    await carregarEnturmacao();
  } finally {
    salvando.value = false;
  }
}

async function salvarNovoResponsavel() {
  if (!alunoId.value) return;
  salvando.value = true;
  try {
    let responsavelId: string | null = null;
    if (novoRespTipo.value === 'existente') {
      if (!novoRespEmail.value.trim()) {
        mostrarErro('Informe o e-mail do responsável.');
        return;
      }
      const { data: perfis } = await supabaseClient
        .from('perfis')
        .select('id')
        .eq('email', novoRespEmail.value.trim())
        .limit(1);
      if (!perfis || perfis.length === 0) {
        mostrarErro('Nenhum usuário encontrado com esse e-mail.');
        return;
      }
      const perfilEncontrado = perfis[0];
      if (!perfilEncontrado) {
        mostrarErro('Nenhum usuário encontrado com esse e-mail.');
        return;
      }
      responsavelId = perfilEncontrado.id;
    } else {
      if (!novoRespNome.value.trim() || !novoRespEmail.value.trim()) {
        mostrarErro('Nome e e-mail são obrigatórios.');
        return;
      }
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        mostrarErro('Sessão expirada.');
        return;
      }
      const funcaoUrl =
        import.meta.env.VITE_EDGE_FUNCTIONS_URL ??
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const resp = await fetch(`${funcaoUrl}/criar-usuario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: novoRespNome.value.trim(),
          email: novoRespEmail.value.trim(),
          papel: 'responsavel',
          telefone: novoRespTelefone.value.trim() || null,
        }),
      });
      const resultado = await resp.json();
      if (!resp.ok || !resultado.id) {
        mostrarErro(resultado.error || 'Falha ao criar responsável.');
        return;
      }
      responsavelId = resultado.id;
    }
    const { error: errVinculo } = await supabaseClient.from('vinculos_responsaveis').insert({
      responsavel_id: responsavelId,
      aluno_id: alunoId.value,
      tipo_relacao: novoTipoVinculo.value as VinculoResponsavel['tipo_relacao'],
      contato_prioritario: vinculos.value.length === 0,
      ativo: true,
    });
    if (errVinculo) {
      mostrarErro('Falha ao vincular responsável.');
      return;
    }
    adicionarResponsavel.value = false;
    novoRespEmail.value = '';
    novoRespNome.value = '';
    novoRespTelefone.value = '';
    novoTipoVinculo.value = 'outro';
    await carregarVinculos();
  } finally {
    salvando.value = false;
  }
}

onMounted(async () => {
  turmas.value = await buscarTurmas();
  const id = route.params.id as string | undefined;
  if (id) {
    modoEdicao.value = true;
    alunoId.value = id;
    dataMatricula.value = hoje();
    const alunos = await buscarAlunos();
    const aluno = alunos.find((a) => a.id === id);
    if (aluno) {
      nome.value = aluno.nome;
      matricula.value = aluno.matricula;
      status.value = aluno.status;
      dataNascimento.value = aluno.data_nascimento ?? '';
    }
    const { data: alunoFull } = await supabaseClient
      .from('alunos')
      .select('codigo_inep, data_matricula')
      .eq('id', id)
      .single();
    if (alunoFull) {
      codigoInep.value = alunoFull.codigo_inep ?? '';
      if (alunoFull.data_matricula) dataMatricula.value = alunoFull.data_matricula.slice(0, 10);
    }
    await Promise.all([carregarEnturmacao(), carregarVinculos()]);
  } else {
    dataMatricula.value = hoje();
  }
});

async function salvar() {
  if (!nome.value.trim()) {
    mostrarErro('O campo nome é obrigatório.');
    return;
  }
  if (!matricula.value.trim()) {
    mostrarErro('O campo matrícula é obrigatório.');
    return;
  }
  salvando.value = true;
  try {
    if (modoEdicao.value && alunoId.value) {
      const ok = await atualizarAluno(alunoId.value, {
        nome: nome.value.trim(),
        matricula: matricula.value.trim(),
        status: status.value,
        codigo_inep: codigoInep.value.trim() || undefined,
        data_nascimento: dataNascimento.value || undefined,
        data_matricula: dataMatricula.value || undefined,
        observacoes: observacoes.value.trim() || undefined,
      } as Parameters<typeof atualizarAluno>[1] & {
        codigo_inep?: string;
        data_matricula?: string;
      });
      if (ok) {
        router.push('/gestao/alunos');
      } else {
        mostrarErro(erro.value || 'Falha ao atualizar aluno.');
      }
    } else {
      const id = await criarAluno({
        nome: nome.value.trim(),
        matricula: matricula.value.trim(),
        data_nascimento: dataNascimento.value || undefined,
        observacoes: observacoes.value.trim() || undefined,
        turma_id: turmaId.value || undefined,
        ...(vinculoTipo.value === 'existente'
          ? { responsavel_email: responsavelEmail.value.trim() || undefined }
          : {
              responsavel_nome: responsavelNome.value.trim() || undefined,
              responsavel_email: responsavelEmail.value.trim() || undefined,
              responsavel_telefone: responsavelTelefone.value.trim() || undefined,
              tipo_vinculo: tipoVinculo.value,
            }),
      });
      if (id) {
        const updates: Record<string, string | null> = {};
        if (codigoInep.value.trim()) updates.codigo_inep = codigoInep.value.trim();
        if (dataMatricula.value) updates.data_matricula = dataMatricula.value;
        if (Object.keys(updates).length) {
          await supabaseClient.from('alunos').update(updates).eq('id', id);
        }
        router.push('/gestao/alunos');
      } else {
        mostrarErro(erro.value || 'Falha ao criar aluno.');
      }
    }
  } finally {
    salvando.value = false;
  }
}
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

    <h1 class="h5 fw-bold mb-3">
      <i
        :class="'bi bi-' + (modoEdicao ? 'pencil' : 'person-plus') + ' text-primary me-2'"
        aria-hidden="true"
      ></i>
      {{ modoEdicao ? 'Editar aluno' : 'Novo aluno' }}
    </h1>

    <div v-if="mensagemErro" class="alert alert-danger py-2 small mb-3" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      {{ mensagemErro }}
    </div>

    <form @submit.prevent="salvar">
      <div class="card border mb-3">
        <div class="card-header bg-body-tertiary py-2">
          <span class="fw-medium small">Dados do aluno</span>
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
            <label for="campoMatricula" class="form-label small fw-medium">Matrícula</label>
            <input
              id="campoMatricula"
              v-model="matricula"
              type="text"
              class="form-control form-control-sm"
              required
              autocomplete="off"
            />
          </div>
          <div class="mb-3">
            <label for="campoCodigoInep" class="form-label small fw-medium">Código INEP</label>
            <input
              id="campoCodigoInep"
              v-model="codigoInep"
              type="text"
              class="form-control form-control-sm"
              autocomplete="off"
            />
          </div>
          <div class="mb-3">
            <label for="campoDataNasc" class="form-label small fw-medium">Data de nascimento</label>
            <input
              id="campoDataNasc"
              v-model="dataNascimento"
              type="date"
              class="form-control form-control-sm"
              autocomplete="off"
            />
          </div>
          <div class="mb-3">
            <label for="campoDataMatricula" class="form-label small fw-medium"
              >Data de matrícula</label
            >
            <input
              id="campoDataMatricula"
              v-model="dataMatricula"
              type="date"
              class="form-control form-control-sm"
              autocomplete="off"
            />
          </div>
          <div class="mb-0">
            <label for="campoObservacoes" class="form-label small fw-medium">Observações</label>
            <textarea
              id="campoObservacoes"
              v-model="observacoes"
              class="form-control form-control-sm"
              rows="2"
              autocomplete="off"
            ></textarea>
          </div>
        </div>
      </div>

      <div v-if="!modoEdicao" class="card border mb-3">
        <div class="card-header bg-body-tertiary py-2">
          <span class="fw-medium small">Enturmação</span>
        </div>
        <div class="card-body">
          <div class="mb-0">
            <label for="campoTurma" class="form-label small fw-medium">Turma</label>
            <select id="campoTurma" v-model="turmaId" class="form-select form-select-sm">
              <option value="">Selecione uma turma</option>
              <option v-for="t in turmas" :key="t.id" :value="t.id">{{ t.nome_completo }}</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="!modoEdicao" class="card border mb-3">
        <div class="card-header bg-body-tertiary py-2">
          <span class="fw-medium small">Vínculo com responsável</span>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <div class="btn-group btn-group-sm" role="group" aria-label="Tipo de vínculo">
              <input
                v-model="vinculoTipo"
                type="radio"
                class="btn-check"
                name="vinculoTipo"
                id="vinculoExistente"
                value="existente"
                autocomplete="off"
              />
              <label class="btn btn-outline-secondary" for="vinculoExistente"
                >Selecionar existente</label
              >
              <input
                v-model="vinculoTipo"
                type="radio"
                class="btn-check"
                name="vinculoTipo"
                id="vinculoNovo"
                value="novo"
                autocomplete="off"
              />
              <label class="btn btn-outline-secondary" for="vinculoNovo">Criar novo</label>
            </div>
          </div>

          <div class="mb-3">
            <label for="campoRespEmail" class="form-label small fw-medium"
              >E-mail do responsável</label
            >
            <input
              id="campoRespEmail"
              v-model="responsavelEmail"
              type="email"
              class="form-control form-control-sm"
              autocomplete="off"
            />
          </div>

          <template v-if="vinculoTipo === 'novo'">
            <div class="mb-3">
              <label for="campoRespNome" class="form-label small fw-medium"
                >Nome do responsável</label
              >
              <input
                id="campoRespNome"
                v-model="responsavelNome"
                type="text"
                class="form-control form-control-sm"
                autocomplete="off"
              />
            </div>
            <div class="mb-3">
              <label for="campoRespTelefone" class="form-label small fw-medium">Telefone</label>
              <input
                id="campoRespTelefone"
                v-model="responsavelTelefone"
                type="text"
                class="form-control form-control-sm"
                autocomplete="off"
              />
            </div>
            <div class="mb-0">
              <label for="campoTipoVinculo" class="form-label small fw-medium"
                >Tipo de vínculo</label
              >
              <select
                id="campoTipoVinculo"
                v-model="tipoVinculo"
                class="form-select form-select-sm"
              >
                <option value="pai">Pai</option>
                <option value="mae">Mãe</option>
                <option value="tutor">Tutor</option>
                <option value="avo">Avô/Avó</option>
                <option value="irmao">Irmão/Irmã</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </template>
        </div>
      </div>

      <div v-if="modoEdicao" class="card border mb-3">
        <div class="card-header bg-body-tertiary py-2">
          <span class="fw-medium small">Status</span>
        </div>
        <div class="card-body">
          <div class="mb-0">
            <select v-model="status" class="form-select form-select-sm">
              <option value="ativo">Ativo</option>
              <option value="egresso">Egresso</option>
              <option value="transferido">Transferido</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="modoEdicao" class="card border mb-3">
        <div class="card-header bg-body-tertiary py-2">
          <span class="fw-medium small">Enturmação atual</span>
        </div>
        <div class="card-body">
          <p v-if="enturmacaoAtual" class="mb-2 small">
            <span class="fw-medium">Turma:</span> {{ turmaAtualNome }}
            <br />
            <span class="fw-medium">Matrícula em:</span>
            {{ new Date(enturmacaoAtual.data_matricula).toLocaleDateString('pt-BR') }}
          </p>
          <p v-else class="mb-2 small text-body-secondary">Aluno não enturmado.</p>

          <button
            v-if="!alterarEnturmacao"
            type="button"
            class="btn btn-sm btn-outline-success"
            @click="alterarEnturmacao = true"
          >
            <i class="bi bi-arrow-left-right me-1" aria-hidden="true"></i>
            Alterar enturmação
          </button>

          <div v-if="alterarEnturmacao" class="border rounded p-3 mt-2 bg-body-tertiary">
            <div class="mb-3">
              <label for="campoNovaTurma" class="form-label small fw-medium">Nova turma</label>
              <select id="campoNovaTurma" v-model="novaTurmaId" class="form-select form-select-sm">
                <option value="">Selecione uma turma</option>
                <option v-for="t in turmas" :key="t.id" :value="t.id">{{ t.nome_completo }}</option>
              </select>
            </div>
            <div class="mb-3">
              <label for="campoNovaDataMat" class="form-label small fw-medium"
                >Data matrícula</label
              >
              <input
                id="campoNovaDataMat"
                v-model="novaDataMatricula"
                type="date"
                class="form-control form-control-sm"
                autocomplete="off"
              />
            </div>
            <div class="d-flex gap-2 justify-content-end">
              <button
                type="button"
                class="btn btn-sm btn-success"
                :disabled="salvando"
                @click="salvarAlterarEnturmacao"
              >
                <span
                  v-if="salvando"
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                <i v-else class="bi bi-check-lg me-1" aria-hidden="true"></i>
                Salvar
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="alterarEnturmacao = false"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="modoEdicao" class="card border mb-3">
        <div class="card-header bg-body-tertiary py-2">
          <span class="fw-medium small">Responsáveis vinculados</span>
        </div>
        <div class="card-body">
          <div
            v-if="vinculos.length === 0 && !adicionarResponsavel"
            class="text-body-secondary small mb-2"
          >
            Nenhum responsável vinculado.
          </div>

          <div
            v-for="v in vinculos"
            :key="v.id"
            class="border rounded p-2 mb-2 small bg-body-tertiary"
          >
            <div class="fw-medium">{{ v.responsavel_nome }}</div>
            <div class="text-body-secondary">{{ v.responsavel_email }}</div>
            <div class="d-flex gap-2 mt-1">
              <span class="badge text-bg-secondary">{{ v.tipo_relacao }}</span>
              <span v-if="v.contato_prioritario" class="badge text-bg-warning"
                >Contato prioritário</span
              >
            </div>
          </div>

          <button
            v-if="!adicionarResponsavel"
            type="button"
            class="btn btn-sm btn-outline-success"
            @click="adicionarResponsavel = true"
          >
            <i class="bi bi-person-plus me-1" aria-hidden="true"></i>
            Adicionar responsável
          </button>

          <div v-if="adicionarResponsavel" class="border rounded p-3 mt-2 bg-body-tertiary">
            <div class="mb-3">
              <div class="btn-group btn-group-sm" role="group" aria-label="Tipo de responsável">
                <input
                  v-model="novoRespTipo"
                  type="radio"
                  class="btn-check"
                  name="novoRespTipo"
                  id="novoRespExistente"
                  value="existente"
                  autocomplete="off"
                />
                <label class="btn btn-outline-secondary" for="novoRespExistente">Existente</label>
                <input
                  v-model="novoRespTipo"
                  type="radio"
                  class="btn-check"
                  name="novoRespTipo"
                  id="novoRespNovo"
                  value="novo"
                  autocomplete="off"
                />
                <label class="btn btn-outline-secondary" for="novoRespNovo">Criar novo</label>
              </div>
            </div>

            <div class="mb-3">
              <label for="campoNovoRespEmail" class="form-label small fw-medium"
                >E-mail do responsável</label
              >
              <input
                id="campoNovoRespEmail"
                v-model="novoRespEmail"
                type="email"
                class="form-control form-control-sm"
                autocomplete="off"
              />
            </div>

            <template v-if="novoRespTipo === 'novo'">
              <div class="mb-3">
                <label for="campoNovoRespNome" class="form-label small fw-medium">Nome</label>
                <input
                  id="campoNovoRespNome"
                  v-model="novoRespNome"
                  type="text"
                  class="form-control form-control-sm"
                  autocomplete="off"
                />
              </div>
              <div class="mb-3">
                <label for="campoNovoRespTelefone" class="form-label small fw-medium"
                  >Telefone</label
                >
                <input
                  id="campoNovoRespTelefone"
                  v-model="novoRespTelefone"
                  type="text"
                  class="form-control form-control-sm"
                  autocomplete="off"
                />
              </div>
              <div class="mb-3">
                <label for="campoNovoTipoVinculo" class="form-label small fw-medium"
                  >Tipo de vínculo</label
                >
                <select
                  id="campoNovoTipoVinculo"
                  v-model="novoTipoVinculo"
                  class="form-select form-select-sm"
                >
                  <option value="pai">Pai</option>
                  <option value="mae">Mãe</option>
                  <option value="tutor">Tutor</option>
                  <option value="avo">Avô/Avó</option>
                  <option value="irmao">Irmão/Irmã</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </template>

            <div class="d-flex gap-2 justify-content-end">
              <button
                type="button"
                class="btn btn-sm btn-success"
                :disabled="salvando"
                @click="salvarNovoResponsavel"
              >
                <span
                  v-if="salvando"
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                <i v-else class="bi bi-check-lg me-1" aria-hidden="true"></i>
                Vincular
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="adicionarResponsavel = false"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex gap-2 justify-content-end">
        <router-link to="/gestao/alunos" class="btn btn-sm btn-outline-secondary"
          >Cancelar</router-link
        >
        <button type="submit" class="btn btn-sm btn-success" :disabled="salvando || carregando">
          <span
            v-if="salvando"
            class="spinner-border spinner-border-sm me-1"
            role="status"
            aria-hidden="true"
          ></span>
          <i v-else class="bi bi-check-lg me-1" aria-hidden="true"></i>
          {{ modoEdicao ? 'Salvar alterações' : 'Criar aluno' }}
        </button>
      </div>
    </form>
  </div>
</template>
