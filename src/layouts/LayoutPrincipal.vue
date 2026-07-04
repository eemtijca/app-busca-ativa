<script setup lang="ts">
import { useAcessibilidade } from '@/composables/useAcessibilidade'

const { lerTexto, alternarContraste, aumentarFonte, diminuirFonte } = useAcessibilidade()

function lerTela(): void {
  const texto = document.body.innerText
  lerTexto(texto)
}
</script>

<template>
  <nav
    class="navbar navbar-expand-lg navbar-dark bg-dark"
    role="navigation"
    aria-label="Barra de acessibilidade"
  >
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">Busca Ativa</span>

      <div class="d-flex gap-2 align-items-center flex-wrap">
        <button
          class="btn btn-outline-light btn-sm"
          aria-label="Ler conteúdo da tela"
          title="Ler tela"
          @click="lerTela"
        >
          🔊 Ler Tela
        </button>

        <button
          class="btn btn-outline-light btn-sm"
          aria-label="Alternar alto contraste"
          title="Alto contraste"
          @click="alternarContraste"
        >
          ◑ Contraste
        </button>

        <button
          class="btn btn-outline-light btn-sm"
          aria-label="Aumentar tamanho da fonte"
          title="Aumentar fonte"
          @click="aumentarFonte"
        >
          A+
        </button>

        <button
          class="btn btn-outline-light btn-sm"
          aria-label="Diminuir tamanho da fonte"
          title="Diminuir fonte"
          @click="diminuirFonte"
        >
          A−
        </button>
      </div>
    </div>
  </nav>

  <main class="container-fluid py-3" role="main">
    <router-view />
  </main>
</template>
