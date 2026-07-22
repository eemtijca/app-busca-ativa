<script setup lang="ts">
import { useAutenticacao } from '@/composables/useAutenticacao';
import CartaoNavegacao from '@/componentes/CartaoNavegacao.vue';

const { usuario } = useAutenticacao();
const nomeProfessor = usuario.value?.nome || 'Professor';
</script>

<template>
  <div class="container py-4 py-md-5" style="max-width: 800px">
    <div class="text-center mb-4 mb-md-5">
      <span
        class="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success mb-3"
        style="width: 64px; height: 64px; font-size: 1.75rem"
      >
        <i class="bi bi-person-workspace" aria-hidden="true"></i>
      </span>
      <h1 class="h4 fw-bold mb-1">Olá, {{ nomeProfessor }}</h1>
      <p class="text-body-secondary small mb-0">
        Registre a frequência e acompanhe sua turma em poucos cliques.
      </p>
    </div>

    <div class="row g-3 justify-content-center">
      <div class="col-12 col-md-6 col-lg-4">
        <CartaoNavegacao
          icone="check2-square"
          titulo="Registrar frequência"
          descricao="Marque presenças e ausências da turma de forma rápida."
          rota="/professor/frequencia"
          cor="success"
        />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <CartaoNavegacao
          icone="clock-history"
          titulo="Ausência em aula"
          descricao="Registre quando o aluno faltou a um período específico."
          rota="/professor/ausencia"
          cor="success"
        />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <CartaoNavegacao
          icone="exclamation-triangle"
          titulo="Ocorrência grave"
          descricao="Registre comportamentos extremos que ameacem a permanência."
          rota="/professor/ocorrencia"
          cor="success"
        />
      </div>
    </div>
  </div>
</template>
