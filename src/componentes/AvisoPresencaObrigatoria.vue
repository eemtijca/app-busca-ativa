<script setup lang="ts">
/**
 * AvisoPresencaObrigatoria - Alerta claro exibido para o
 * responsável quando há suspensão ou ocorrência grave que exige
 * sua ida presencial à escola para liberar o retorno do aluno.
 *
 * É um componente DUMB: recebe o conteúdo via props e emite ações.
 *
 * API:
 *   - alunoNome: string
 *   - descricao: string — descrição da ocorrência/suspensão
 *   - data: string — data da ocorrência
 *   - @confirmar: emitido ao clicar em "Confirmar comparecimento"
 *   - @ver-detalhes: emitido ao clicar em "Ver detalhes"
 */

defineProps<{
  alunoNome: string;
  descricao: string;
  data: string;
}>();

const emit = defineEmits<{
  confirmar: [];
  'ver-detalhes': [];
}>();
</script>

<template>
  <aside class="card border-danger border-2 shadow-sm" role="alert" aria-live="assertive">
    <div class="card-body p-3">
      <div class="d-flex gap-3">
        <span
          class="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger text-white flex-shrink-0"
          style="width: 48px; height: 48px"
          aria-hidden="true"
        >
          <i class="bi bi-exclamation-octagon fs-4"></i>
        </span>
        <div class="min-w-0 flex-grow-1">
          <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h2 class="h6 mb-0 fw-bold text-danger">Presença obrigatória na escola</h2>
            <small class="text-body-secondary ms-auto">{{ data }}</small>
          </div>
          <p class="mb-1 small">
            O retorno do(a) aluno(a) <strong>{{ alunoNome }}</strong> às aulas presenciais está
            bloqueado até que você compareça à escola.
          </p>
          <p class="mb-2 small text-body-secondary">{{ descricao }}</p>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-danger btn-sm" @click="emit('confirmar')">
              <i class="bi bi-calendar-check me-1" aria-hidden="true"></i>
              Confirmar comparecimento
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              @click="emit('ver-detalhes')"
            >
              <i class="bi bi-eye me-1" aria-hidden="true"></i>
              Ver detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}
</style>
