<script setup lang="ts">
/**
 * CartaoAlertaResponsavel - Cartão de alerta exibido no painel
 * do responsável. Suporta 4 tipos: ausência da escola, ausência
 * em aula, suspensão e comunicado.
 *
 * É um componente DUMB: recebe o alerta via props e emite ações.
 *
 * API:
 *   - alerta: AlertaResponsavel
 *   - @ver-detalhes: emitido ao clicar em "Ver detalhes"
 *   - @enviar-justificativa: emitido ao clicar em "Enviar justificativa"
 */

import { computed } from 'vue';
import type { AlertaResponsavel } from '@/tipos/componentes';

const props = defineProps<{
  alerta: AlertaResponsavel;
}>();

const emit = defineEmits<{
  'ver-detalhes': [alertaId: string];
  'enviar-justificativa': [alertaId: string];
}>();

const configTipo: Record<
  AlertaResponsavel['tipo'],
  { icone: string; classe: string; rotulo: string }
> = {
  ausencia_escola: {
    icone: 'bi-door-closed-fill',
    classe: 'text-bg-danger',
    rotulo: 'Ausência da escola',
  },
  ausencia_aula: {
    icone: 'bi-clock-fill',
    classe: 'text-bg-warning',
    rotulo: 'Ausência em aula',
  },
  suspensao: {
    icone: 'bi-shield-exclamation',
    classe: 'text-bg-dark',
    rotulo: 'Suspensão',
  },
  comunicado: {
    icone: 'bi-megaphone-fill',
    classe: 'text-bg-info',
    rotulo: 'Comunicado',
  },
};

const config = computed(() => configTipo[props.alerta.tipo]);

const classeBorda = computed(() => {
  if (props.alerta.urgente) return 'border-danger border-2';
  return 'border-start border-4';
});

const classeBordaEspecifica = computed(() => {
  switch (props.alerta.tipo) {
    case 'ausencia_escola':
      return 'border-danger';
    case 'ausencia_aula':
      return 'border-warning';
    case 'suspensao':
      return 'border-dark';
    case 'comunicado':
    default:
      return 'border-info';
  }
});
</script>

<template>
  <div class="card shadow-sm h-100" :class="[classeBorda, classeBordaEspecifica]">
    <div class="card-body d-flex gap-3 p-3">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
        :class="config.classe"
        style="width: 48px; height: 48px"
        aria-hidden="true"
      >
        <i :class="'bi bi-' + config.icone" style="font-size: 1.25rem"></i>
      </span>

      <div class="min-w-0 flex-grow-1">
        <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
          <span class="badge" :class="config.classe">{{ config.rotulo }}</span>
          <span v-if="alerta.urgente" class="badge text-bg-danger-subtle text-danger-emphasis">
            <i class="bi bi-exclamation-circle me-1" aria-hidden="true"></i>Urgente
          </span>
          <small class="text-body-secondary ms-auto">{{ alerta.data }}</small>
        </div>
        <h3 class="h6 mb-1 fw-semibold">{{ alerta.titulo }}</h3>
        <p class="card-text small mb-2">{{ alerta.descricao }}</p>
        <div v-if="alerta.periodo" class="text-body-secondary small mb-2">
          <i class="bi bi-clock me-1" aria-hidden="true"></i>Período: {{ alerta.periodo }}
        </div>

        <div class="d-flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-sm btn-outline-primary"
            @click="emit('ver-detalhes', alerta.id)"
          >
            <i class="bi bi-eye me-1" aria-hidden="true"></i>
            Ver detalhes
          </button>
          <button
            v-if="alerta.tipo === 'ausencia_escola' || alerta.tipo === 'ausencia_aula'"
            type="button"
            class="btn btn-sm btn-success"
            @click="emit('enviar-justificativa', alerta.id)"
          >
            <i class="bi bi-paperclip me-1" aria-hidden="true"></i>
            Enviar justificativa
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}
</style>
