<script setup lang="ts">
/**
 * ChatHorarioProtegido - Canal de diálogo entre responsável e
 * coordenação, com proteção de horário (fora do horário escolar
 * o envio de mensagens é desativado e um aviso é exibido).
 *
 * É um componente DUMB: recebe as mensagens e o estado de horário
 * via props. A página inteligente é responsável por calcular
 * "horarioAtivo" e por enviar/ascender as mensagens via Supabase.
 *
 * API:
 *   - mensagens: MensagemChat[]
 *   - horarioAtivo: boolean — false desativa o envio e mostra aviso
 *   - mensagemForaHorario: string — texto exibido quando bloqueado
 *   - enviando: boolean
 *   - @enviar-mensagem: emite o texto digitado
 */

import { ref, nextTick, watch } from 'vue';
import type { MensagemChat } from '@/tipos/componentes';

const props = withDefaults(
  defineProps<{
    mensagens: MensagemChat[];
    horarioAtivo: boolean;
    mensagemForaHorario?: string;
    enviando?: boolean;
  }>(),
  {
    mensagemForaHorario: '',
    enviando: false,
  },
);

const emit = defineEmits<{
  'enviar-mensagem': [texto: string];
}>();

const texto = ref('');
const contenedorMensagens = ref<HTMLElement | null>(null);

async function rolarParaBaixo() {
  await nextTick();
  if (contenedorMensagens.value) {
    contenedorMensagens.value.scrollTop = contenedorMensagens.value.scrollHeight;
  }
}

watch(
  () => props.mensagens.length,
  () => rolarParaBaixo(),
  { immediate: true },
);

function submeter() {
  if (!props.horarioAtivo || !texto.value.trim()) return;
  emit('enviar-mensagem', texto.value.trim());
  texto.value = '';
}
</script>

<template>
  <section
    class="card shadow-sm border-0 d-flex flex-column h-100"
    aria-label="Canal de diálogo com a coordenação"
  >
    <div class="card-header bg-body-tertiary d-flex align-items-center gap-2">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary text-white flex-shrink-0"
        style="width: 36px; height: 36px"
        aria-hidden="true"
      >
        <i class="bi bi-chat-dots"></i>
      </span>
      <div class="min-w-0 flex-grow-1">
        <div class="fw-semibold text-truncate">Coordenação escolar</div>
        <small :class="horarioAtivo ? 'text-success' : 'text-body-secondary'">
          <span
            class="d-inline-block rounded-circle me-1"
            :class="horarioAtivo ? 'bg-success' : 'bg-secondary'"
            style="width: 8px; height: 8px"
            aria-hidden="true"
          ></span>
          {{ horarioAtivo ? 'Online agora' : 'Fora do horário escolar' }}
        </small>
      </div>
    </div>

    <!--
      Área de mensagens. role="log" garante anúncio de novas
      mensagens por leitores de tela.
    -->
    <div
      ref="contenedorMensagens"
      class="card-body overflow-auto p-3 bg-body"
      role="log"
      aria-live="polite"
      aria-label="Histórico de mensagens"
      style="min-height: 280px; max-height: 60vh"
    >
      <p v-if="!mensagens.length" class="text-body-secondary text-center my-auto">
        <i class="bi bi-chat-text d-block fs-1 mb-2" aria-hidden="true"></i>
        Nenhuma mensagem ainda. Inicie a conversa com a coordenação.
      </p>

      <div
        v-for="msg in mensagens"
        :key="msg.id"
        class="d-flex mb-2"
        :class="msg.autor === 'responsavel' ? 'justify-content-end' : 'justify-content-start'"
      >
        <div
          class="rounded-3 px-3 py-2 shadow-sm"
          :class="
            msg.autor === 'responsavel' ? 'bg-primary text-white' : 'bg-body-tertiary text-body'
          "
          style="max-width: 80%"
        >
          <div
            class="small fw-semibold mb-1"
            :class="msg.autor === 'responsavel' ? 'text-white-50' : 'text-body-secondary'"
          >
            {{ msg.nomeAutor }}
          </div>
          <div class="text-break">{{ msg.texto }}</div>
          <div
            class="small mt-1"
            :class="msg.autor === 'responsavel' ? 'text-white-50' : 'text-body-secondary'"
          >
            {{ msg.data }} · {{ msg.horario }}
          </div>
        </div>
      </div>
    </div>

    <!--
      Aviso de horário protegido. Quando o horário não está ativo,
      o campo é desativado e o aviso é exibido em amarelo.
    -->
    <div
      v-if="!horarioAtivo && mensagemForaHorario"
      class="alert alert-warning rounded-0 mb-0 py-2"
      role="status"
    >
      <i class="bi bi-clock-history me-2" aria-hidden="true"></i>
      {{ mensagemForaHorario }}
    </div>

    <div class="card-footer p-2">
      <form @submit.prevent="submeter" class="d-flex gap-2 align-items-end">
        <label for="entradaChat" class="visually-hidden">Digite sua mensagem</label>
        <textarea
          id="entradaChat"
          v-model="texto"
          class="form-control"
          rows="1"
          :placeholder="
            horarioAtivo ? 'Digite sua mensagem...' : 'Envio bloqueado fora do horário escolar'
          "
          :disabled="!horarioAtivo || enviando"
          :aria-disabled="!horarioAtivo"
          @keydown.enter.prevent="submeter"
          style="resize: none"
        ></textarea>
        <button
          type="submit"
          class="btn btn-primary flex-shrink-0"
          :disabled="!horarioAtivo || enviando || !texto.trim()"
          :aria-label="horarioAtivo ? 'Enviar mensagem' : 'Envio bloqueado'"
        >
          <span
            v-if="enviando"
            class="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          ></span>
          <i v-else class="bi bi-send" aria-hidden="true"></i>
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}
.text-break {
  word-break: break-word;
  overflow-wrap: anywhere;
}
</style>
