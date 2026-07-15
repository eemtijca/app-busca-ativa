<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacao } from '@/composables/useAutenticacao';
import { useMonitoramento } from '@/composables/useMonitoramento';
import ChatHorarioProtegido from '@/componentes/ChatHorarioProtegido.vue';
import type { MensagemChat } from '@/tipos/componentes';

const router = useRouter();
const { usuario } = useAutenticacao();
const { buscarMensagensChat, horarioProtegidoAtivo, obterHorarioProtegido } = useMonitoramento();

const mensagens = ref<MensagemChat[]>([]);
const horarioAtivo = ref(false);
const horarioConfig = obterHorarioProtegido();
const mensagemSucesso = ref<string | null>(null);
const mensagemErro = ref<string | null>(null);

function mostrarSucesso(msg: string) {
  mensagemSucesso.value = msg;
  setTimeout(() => (mensagemSucesso.value = null), 4000);
}

function mostrarErro(msg: string) {
  mensagemErro.value = msg;
  setTimeout(() => (mensagemErro.value = null), 4000);
}

function enviarMensagemChat(texto: string) {
  if (!usuario.value) return;
  if (!horarioAtivo.value) {
    mostrarErro('Não é possível enviar mensagens fora do horário escolar.');
    return;
  }
  const agora = new Date();
  const novaMsg: MensagemChat = {
    id: 'local-' + Date.now(),
    autor: 'responsavel',
    nomeAutor: usuario.value.nome,
    texto,
    horario: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    data: agora.toLocaleDateString('pt-BR'),
  };
  mensagens.value.push(novaMsg);
  mostrarSucesso('Mensagem enviada para a coordenação.');
}

let intervaloRelogio: number | null = null;

onMounted(async () => {
  horarioAtivo.value = horarioProtegidoAtivo();
  if (usuario.value) {
    mensagens.value = await buscarMensagensChat(usuario.value.id);
  }
  intervaloRelogio = window.setInterval(() => {
    horarioAtivo.value = horarioProtegidoAtivo();
  }, 60_000);
});

onUnmounted(() => {
  if (intervaloRelogio) window.clearInterval(intervaloRelogio);
});
</script>

<template>
  <div class="container py-4" style="max-width: 800px">
    <button type="button" class="btn btn-sm btn-outline-secondary mb-3" @click="router.back()">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>
      Voltar
    </button>

    <h1 class="h5 fw-bold mb-3">
      <i class="bi bi-chat-dots text-primary me-2" aria-hidden="true"></i>
      Falar com a coordenação
    </h1>

    <div v-if="mensagemSucesso" class="alert alert-success py-2 small mb-3" role="status">
      <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
      {{ mensagemSucesso }}
    </div>
    <div v-if="mensagemErro" class="alert alert-danger py-2 small mb-3" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      {{ mensagemErro }}
    </div>

    <ChatHorarioProtegido
      :mensagens="mensagens"
      :horario-ativo="horarioAtivo"
      :mensagem-fora-horario="horarioConfig.mensagemForaHorario"
      :enviando="false"
      @enviar-mensagem="enviarMensagemChat"
    />
  </div>
</template>
