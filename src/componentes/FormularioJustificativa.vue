<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

withDefaults(
  defineProps<{
    alunoNome?: string;
    alunoTurma?: string;
    enviando?: boolean;
  }>(),
  {
    alunoNome: '',
    alunoTurma: '',
    enviando: false,
  },
);

const router = useRouter();
const emit = defineEmits<{
  enviar: [payload: { motivo: string; dataAusencia: string; arquivo: File | null }];
}>();

const motivo = ref('');
const dataAusencia = ref('');
const arquivo = ref<File | null>(null);
const erroValidacao = ref<string | null>(null);

const nomeArquivo = computed(() => (arquivo.value ? arquivo.value.name : ''));
const tamanhoArquivo = computed(() => {
  if (!arquivo.value) return '';
  const kb = arquivo.value.size / 1024;
  if (kb < 1024) return kb.toFixed(0) + ' KB';
  return (kb / 1024).toFixed(1) + ' MB';
});

function aoSelecionarArquivo(event: Event) {
  const alvo = event.target as HTMLInputElement;
  if (alvo.files && alvo.files.length > 0) {
    const file = alvo.files[0];
    if (!file) return;
    // Limite prático para pais com dados limitados: 5 MB
    if (file.size > 5 * 1024 * 1024) {
      erroValidacao.value = 'O arquivo é maior que 5 MB. Envie uma imagem menor.';
      arquivo.value = null;
      alvo.value = '';
      return;
    }
    arquivo.value = file;
    erroValidacao.value = null;
  }
}

function limparArquivo() {
  arquivo.value = null;
  const input = document.getElementById('inputArquivoJustificativa') as HTMLInputElement | null;
  if (input) input.value = '';
}

function submeter() {
  if (!motivo.value.trim()) {
    erroValidacao.value = 'Descreva o motivo da ausência.';
    return;
  }
  if (!dataAusencia.value) {
    erroValidacao.value = 'Informe a data da ausência.';
    return;
  }
  erroValidacao.value = null;
  emit('enviar', {
    motivo: motivo.value.trim(),
    dataAusencia: dataAusencia.value,
    arquivo: arquivo.value,
  });
  motivo.value = '';
  dataAusencia.value = '';
  limparArquivo();
}
</script>

<template>
  <form @submit.prevent="submeter" novalidate>
    <div v-if="alunoNome" class="alert alert-light border d-flex align-items-center gap-2 mb-3">
      <i class="bi bi-person-badge text-success fs-5" aria-hidden="true"></i>
      <div>
        <div class="fw-medium small">{{ alunoNome }}</div>
        <small v-if="alunoTurma" class="text-body-secondary">{{ alunoTurma }}</small>
      </div>
    </div>

    <div v-if="erroValidacao" class="alert alert-danger d-flex align-items-center py-2 small mb-3" role="alert">
      <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
      <span>{{ erroValidacao }}</span>
    </div>

    <div class="mb-3">
      <label for="dataAusencia" class="form-label fw-medium small">Data da ausência</label>
      <input
        id="dataAusencia"
        v-model="dataAusencia"
        type="date"
        class="form-control form-control-sm"
        :disabled="enviando"
        required
      />
    </div>

    <div class="mb-3">
      <label for="motivo" class="form-label fw-medium small">Motivo da ausência</label>
      <textarea
        id="motivo"
        v-model="motivo"
        class="form-control form-control-sm"
        rows="3"
        placeholder="Ex.: Ateste médico, consulta, falecimento na família..."
        :disabled="enviando"
        required
      ></textarea>
    </div>

    <div class="mb-3">
      <label class="form-label fw-medium small">Anexar atestado ou comprovante</label>
      <div
        v-if="!arquivo"
        class="border border-2 border-dashed rounded-3 p-3 text-center text-body-secondary"
      >
        <i class="bi bi-cloud-arrow-up fs-4 d-block mb-2" aria-hidden="true"></i>
        <p class="mb-2 small">Toque para escolher uma foto ou documento do celular.</p>
        <label
          for="inputArquivoJustificativa"
          class="btn btn-success btn-sm"
          :class="{ disabled: enviando }"
        >
          <i class="bi bi-camera me-2" aria-hidden="true"></i>
          Escolher arquivo
        </label>
        <input
          id="inputArquivoJustificativa"
          type="file"
          accept="image/*,application/pdf"
          class="visually-hidden"
          :disabled="enviando"
          @change="aoSelecionarArquivo"
        />
        <small class="d-block mt-2">Aceita imagem ou PDF até 5 MB.</small>
      </div>

      <div v-else class="alert alert-success d-flex align-items-center gap-2 mb-0 py-2 small">
        <i class="bi bi-file-earmark-check fs-5" aria-hidden="true"></i>
        <div class="flex-grow-1 min-w-0">
          <div class="fw-medium text-truncate">{{ nomeArquivo }}</div>
          <small class="text-body-secondary">{{ tamanhoArquivo }}</small>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-outline-danger"
          :disabled="enviando"
          aria-label="Remover arquivo selecionado"
          @click="limparArquivo"
        >
          <i class="bi bi-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <div class="d-flex gap-2 justify-content-end">
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="router.back()">Cancelar</button>
      <button type="submit" class="btn btn-sm btn-success" :disabled="enviando">
        <span
          v-if="enviando"
          class="spinner-border spinner-border-sm me-1"
          role="status"
          aria-hidden="true"
        ></span>
        <i v-else class="bi bi-send me-1" aria-hidden="true"></i>
        {{ enviando ? 'Enviando...' : 'Enviar' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}
</style>
