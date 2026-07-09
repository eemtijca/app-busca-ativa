<script setup lang="ts">
/**
 * ModalBase - Componente de janela modal.
 *
 * Cinco variantes: padrão (header + body + footer), folha (bottom sheet
 * estilo iOS), escolha (pergunta com dois botões), tour (lista de
 * funcionalidades), cadastro (com slot para formulário).
 * Utiliza a classe Modal do Bootstrap JS para controle programático.
 *
 * API:
 * - variante?: tipo de modal
 * - titulo?: string
 * - modelValue: boolean — controle de abertura (v-model)
 * - tamanho?: 'sm' | 'lg' | 'xl'
 * - fecharLabel?: string — aria-label do botão fechar
 * - rotuloSim?: string — variante escolha (botão sim)
 * - rotuloNao?: string — variante escolha (botão não)
 * - rotuloTour?: string — variante tour (botão)
 * - slot default: conteúdo do body
 * - slot 'rodape': conteúdo do footer (padrão, folha)
 * - @update:modelValue — emitido ao abrir/fechar
 */

import { ref, watch, onMounted, type Ref } from 'vue';
import { Modal } from 'bootstrap';

const props = withDefaults(
  defineProps<{
    variante?: 'padrao' | 'folha' | 'escolha' | 'tour' | 'cadastro';
    titulo?: string;
    modelValue: boolean;
    tamanho?: 'sm' | 'md' | 'lg' | 'xl';
    fecharLabel?: string;
    rotuloSim?: string;
    rotuloNao?: string;
    rotuloTour?: string;
  }>(),
  {
    variante: 'padrao',
    titulo: '',
    tamanho: 'md',
    fecharLabel: '',
    rotuloSim: '',
    rotuloNao: '',
    rotuloTour: '',
  },
);

const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
}>();

const idUnico = ref('modal-' + Math.random().toString(36).slice(2, 9));
const elementoModal: Ref<HTMLElement | null> = ref(null);
let instanciaModal: Modal | null = null;

onMounted(() => {
  if (elementoModal.value) {
    instanciaModal = new Modal(elementoModal.value as HTMLElement, { backdrop: 'static' });
    elementoModal.value.addEventListener('hidden.bs.modal', () => {
      emit('update:modelValue', false);
    });
  }
});

watch(
  () => props.modelValue,
  (valor) => {
    if (valor && instanciaModal) {
      instanciaModal.show();
    } else if (!valor && instanciaModal) {
      instanciaModal.hide();
    }
  },
);

const classesDialog = `modal-dialog${props.tamanho !== 'md' ? ' modal-' + props.tamanho : ''}${props.variante === 'folha' ? ' modal-dialog-centered' : ''}`;
const classesModal = `${props.variante === 'folha' ? 'modal-sheet' : ''} modal fade`;

function definirRef(el: unknown) {
  if (el instanceof HTMLElement) elementoModal.value = el;
}
</script>

<template>
  <div
    :ref="definirRef"
    :class="classesModal"
    :id="idUnico"
    tabindex="-1"
    role="dialog"
    aria-hidden="true"
  >
    <!-- Padrão: header + body + footer -->
    <div v-if="variante === 'padrao'" :class="classesDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h1 v-if="titulo" class="modal-title fs-5">{{ titulo }}</h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            :aria-label="fecharLabel || 'Fechar'"
          ></button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer">
          <slot name="rodape" />
        </div>
      </div>
    </div>

    <!-- Folha: bottom sheet estilo iOS -->
    <div v-else-if="variante === 'folha'" :class="classesDialog">
      <div class="modal-content rounded-4 shadow">
        <div class="modal-header border-bottom-0">
          <h1 v-if="titulo" class="modal-title fs-5">{{ titulo }}</h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            :aria-label="fecharLabel || 'Fechar'"
          ></button>
        </div>
        <div class="modal-body py-0">
          <slot />
        </div>
        <div class="modal-footer flex-column align-items-stretch w-100 gap-2 pb-3 border-top-0">
          <slot name="rodape" />
        </div>
      </div>
    </div>

    <!-- Escolha: body texto + dois botoes lado a lado -->
    <div v-else-if="variante === 'escolha'" :class="classesDialog">
      <div class="modal-content rounded-3 shadow">
        <div class="modal-body p-4 text-center">
          <h5 v-if="titulo" class="mb-0">{{ titulo }}</h5>
          <p class="mb-0"><slot /></p>
        </div>
        <div class="modal-footer flex-nowrap p-0">
          <button
            v-if="rotuloSim"
            type="button"
            class="btn btn-lg btn-link fs-6 text-decoration-none col-6 py-3 m-0 rounded-0 border-end"
          >
            <strong>{{ rotuloSim }}</strong>
          </button>
          <button
            v-if="rotuloNao"
            type="button"
            class="btn btn-lg btn-link fs-6 text-decoration-none col-6 py-3 m-0 rounded-0"
            data-bs-dismiss="modal"
          >
            {{ rotuloNao }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tour: lista de funcionalidades + botao -->
    <div v-else-if="variante === 'tour'" :class="classesDialog">
      <div class="modal-content rounded-4 shadow">
        <div class="modal-body p-5">
          <h2 v-if="titulo" class="fw-bold mb-0">{{ titulo }}</h2>
          <slot />
          <button
            v-if="rotuloTour"
            type="button"
            class="btn btn-lg btn-primary mt-5 w-100"
            data-bs-dismiss="modal"
          >
            {{ rotuloTour }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cadastro: slot para formulario -->
    <div v-else-if="variante === 'cadastro'" :class="classesDialog">
      <div class="modal-content rounded-4 shadow">
        <div class="modal-header p-5 pb-4 border-bottom-0">
          <h1 v-if="titulo" class="fw-bold mb-0 fs-2">{{ titulo }}</h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            :aria-label="fecharLabel || 'Fechar'"
          ></button>
        </div>
        <div class="modal-body p-5 pt-0">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-sheet .modal-dialog {
  width: 380px;
  transition: bottom 0.75s ease-in-out;
}
.modal-sheet .modal-footer {
  padding-bottom: 2rem;
}
</style>
