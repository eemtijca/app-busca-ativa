<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useMonitoramento } from '@/composables/useMonitoramento';
import CampoFormulario from '@/componentes/CampoFormulario.vue';
import GrupoCheckbox from '@/componentes/GrupoCheckbox.vue';
import type { AlunoFrequencia } from '@/tipos/componentes';

const router = useRouter();
const { usuario } = useAutenticacao();
const { buscarAlunosParaFrequencia, registrarAusenciaEmPeriodo, carregando } = useMonitoramento();

const alunos = ref<AlunoFrequencia[]>([]);
const alunoId = ref('');
const periodos = ref<string[]>([]);
const justificativa = ref('');
const mensagemErro = ref<string | null>(null);

const opcoesPeriodos = [
  { valor: '1º Horário', rotulo: '1º Horário' },
  { valor: '2º Horário', rotulo: '2º Horário' },
  { valor: '3º Horário', rotulo: '3º Horário' },
  { valor: '4º Horário', rotulo: '4º Horário' },
  { valor: 'Manhã', rotulo: 'Manhã' },
  { valor: 'Tarde', rotulo: 'Tarde' },
];

const opcoesMotivos = [
  { valor: 'enfermaria', rotulo: 'Enfermaria', icone: 'heart-pulse' },
  { valor: 'orientacao', rotulo: 'Orientação pedagógica', icone: 'people' },
  { valor: 'saida_antecipada', rotulo: 'Saída antecipada', icone: 'door-open' },
  { valor: 'conselho_tutelar', rotulo: 'Conselho tutelar', icone: 'shield-check' },
  { valor: 'atendimento_psicologico', rotulo: 'Atendimento psicológico', icone: 'heart' },
  { valor: 'atividade_externa', rotulo: 'Atividade externa', icone: 'briefcase' },
];

const motivos = ref<string[]>([]);
const dataAula = ref(new Date().toISOString().slice(0, 10));

const justificativaSugerida = computed(() => {
  if (!motivos.value.length) return '';
  const nomes = motivos.value.map((m) => opcoesMotivos.find((o) => o.valor === m)?.rotulo ?? m);
  return `Aluno encaminhado para ${nomes.join(', ')}.`;
});

const contadorJustificativa = computed(() => justificativa.value.length);

function aplicarMotivo() {
  if (!justificativa.value || justificativa.value === justificativaSugerida.value) {
    justificativa.value = justificativaSugerida.value;
  }
}

async function confirmar() {
  if (!usuario.value || !alunoId.value) {
    mensagemErro.value = 'Selecione um aluno.';
    return;
  }
  if (!periodos.value.length) {
    mensagemErro.value = 'Selecione pelo menos um período.';
    return;
  }
  for (const periodo of periodos.value) {
    const ok = await registrarAusenciaEmPeriodo(
      alunoId.value,
      usuario.value.id,
      dataAula.value,
      periodo,
    );
    if (!ok) {
      mensagemErro.value = `Falha ao registrar ausência no ${periodo}. Tente novamente.`;
      return;
    }
  }
  router.back();
}

onMounted(async () => {
  alunos.value = await buscarAlunosParaFrequencia();
});
</script>

<template>
  <div class="container py-4" style="max-width: 800px">
    <div class="d-flex gap-2 mb-3">
      <router-link to="/professor" class="btn btn-sm btn-outline-success">
        <i class="bi bi-house me-1" aria-hidden="true"></i>
        Início
      </router-link>
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="router.back()">
        <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
        Voltar
      </button>
    </div>

    <h1 class="h5 fw-bold mb-3">
      <i class="bi bi-clock-history text-success me-2" aria-hidden="true"></i>
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
        <CampoFormulario id="dataAula" label="Data" :obrigatorio="true">
          <input
            id="dataAula"
            v-model="dataAula"
            type="date"
            class="form-control form-control-sm"
          />
        </CampoFormulario>

        <CampoFormulario id="alunoSelect" label="Aluno" :obrigatorio="true">
          <select id="alunoSelect" v-model="alunoId" class="form-select form-select-sm">
            <option value="" disabled>Selecione um aluno</option>
            <option v-for="a in alunos" :key="a.id" :value="a.id">
              {{ a.nome }} — {{ a.turma || 'Sem turma' }}
            </option>
          </select>
        </CampoFormulario>

        <CampoFormulario
          id="periodosAusencia"
          label="Períodos de ausência"
          :obrigatorio="true"
          dica="Marque um ou mais períodos"
        >
          <GrupoCheckbox
            nome="periodo"
            :opcoes="opcoesPeriodos"
            :modelo="periodos"
            :colunas="3"
            @update:modelo="periodos = $event"
          />
        </CampoFormulario>

        <CampoFormulario
          id="motivosAusencia"
          label="Motivo (preenchimento rápido)"
          dica="Selecione para compor a justificativa automaticamente"
        >
          <GrupoCheckbox
            nome="motivo"
            :opcoes="opcoesMotivos"
            :modelo="motivos"
            :colunas="2"
            @update:modelo="
              (v) => {
                motivos = v;
                aplicarMotivo();
              }
            "
          />
        </CampoFormulario>

        <CampoFormulario
          id="justificativaText"
          label="Justificativa (opcional)"
          :maxlength="500"
          :contador="contadorJustificativa"
        >
          <textarea
            id="justificativaText"
            v-model="justificativa"
            class="form-control form-control-sm"
            rows="3"
            placeholder="Ex.: Encaminhado à enfermaria..."
            maxlength="500"
          ></textarea>
        </CampoFormulario>

        <div class="d-flex gap-2 justify-content-end">
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="router.back()">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-sm btn-success"
            :disabled="carregando || !alunoId || !periodos.length"
            @click="confirmar"
          >
            <span
              v-if="carregando"
              class="spinner-border spinner-border-sm me-1"
              role="status"
            ></span>
            <i v-else class="bi bi-save me-1" aria-hidden="true"></i>
            Registrar {{ periodos.length > 1 ? `${periodos.length} períodos` : '' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
