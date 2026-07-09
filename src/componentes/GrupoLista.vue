<script setup lang="ts">
/**
 * GrupoLista - Componente de lista com múltiplas variantes de interação.
 *
 * Seis variantes: avatar (com imagem + heading + data), checkbox (com
 * input checkbox), radio (com input radio), agenda (checkbox + horário +
 * contenteditable), checkable-radio (input oculto + label estilizada),
 * radio-grid (radio posicionado à direita).
 *
 * API:
 * - itens: ItemLista[] — dados dos itens
 * - variante: tipo de lista
 * - modelValue?: string | number | (string | number)[] — v-model
 * - nome?: string — atributo name para grupos de radio
 * - @update:modelValue — emitido ao selecionar/desselecionar
 */

import type { ItemLista } from '@/tipos/componentes';

const props = withDefaults(
  defineProps<{
    itens: ItemLista[];
    variante: 'avatar' | 'checkbox' | 'radio' | 'agenda' | 'checkable-radio' | 'radio-grid';
    modelValue?: string | number | (string | number)[];
    nome?: string;
  }>(),
  { nome: 'grupo-lista' },
);

const emit = defineEmits<{
  'update:modelValue': [valor: string | number | (string | number)[] | undefined];
}>();

function aoSelecionar(item: ItemLista) {
  if (props.variante === 'checkbox' || props.variante === 'agenda') {
    const atual = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    const idx = atual.indexOf(item.id);
    if (idx >= 0) {
      atual.splice(idx, 1);
    } else {
      atual.push(item.id);
    }
    emit('update:modelValue', atual);
  } else {
    emit('update:modelValue', item.id);
  }
}

function estaSelecionado(item: ItemLista): boolean {
  if (props.variante === 'checkbox' || props.variante === 'agenda') {
    if (Array.isArray(props.modelValue)) {
      return props.modelValue.includes(item.id);
    }
    return false;
  }
  return props.modelValue === item.id;
}
</script>

<template>
  <div
    class="d-flex flex-column flex-md-row p-4 gap-4 py-md-5 align-items-center justify-content-center"
  >
    <!-- avatar: list-group com img + heading + descricao + data -->
    <div v-if="variante === 'avatar'" class="list-group">
      <a
        v-for="item in itens"
        :key="item.id"
        :href="item.avatarSrc ? '#' : undefined"
        class="list-group-item list-group-item-action d-flex gap-3 py-3"
        aria-current="true"
        @click.prevent="aoSelecionar(item)"
      >
        <img
          v-if="item.avatarSrc"
          :src="item.avatarSrc"
          alt=""
          width="32"
          height="32"
          class="rounded-circle flex-shrink-0"
        />
        <div class="d-flex gap-2 w-100 justify-content-between">
          <div>
            <h6 class="mb-0">{{ item.rotulo }}</h6>
            <p class="mb-0 opacity-75">{{ item.descricao }}</p>
          </div>
          <small v-if="item.data" class="opacity-50 text-nowrap">{{ item.data }}</small>
        </div>
      </a>
    </div>

    <!-- checkbox: list-group com input checkbox -->
    <div v-else-if="variante === 'checkbox'" class="list-group">
      <label
        v-for="item in itens"
        :key="item.id"
        class="list-group-item d-flex gap-2"
        :class="{ 'bg-body-tertiary': item.desabilitado }"
      >
        <input
          class="form-check-input flex-shrink-0"
          type="checkbox"
          :checked="estaSelecionado(item)"
          :disabled="item.desabilitado"
          @change="aoSelecionar(item)"
        />
        <span>
          {{ item.rotulo }}
          <small v-if="item.descricao" class="d-block text-body-secondary">{{
            item.descricao
          }}</small>
        </span>
      </label>
    </div>

    <!-- radio: list-group com input radio -->
    <div v-else-if="variante === 'radio'" class="list-group">
      <label v-for="item in itens" :key="item.id" class="list-group-item d-flex gap-2">
        <input
          class="form-check-input flex-shrink-0"
          type="radio"
          :name="nome"
          :checked="estaSelecionado(item)"
          :disabled="item.desabilitado"
          @change="aoSelecionar(item)"
        />
        <span>
          {{ item.rotulo }}
          <small v-if="item.descricao" class="d-block text-body-secondary">{{
            item.descricao
          }}</small>
        </span>
      </label>
    </div>

    <!-- agenda: list-group com checkbox + icone de calendario + horario + contenteditable -->
    <div v-else-if="variante === 'agenda'" class="list-group">
      <label
        v-for="item in itens"
        :key="item.id"
        class="list-group-item d-flex gap-3"
        :class="{ 'bg-body-tertiary': item.desabilitado }"
      >
        <input
          class="form-check-input flex-shrink-0"
          :class="{ 'form-check-input-placeholder bg-body-tertiary pe-none': item.desabilitado }"
          type="checkbox"
          style="font-size: 1.375em"
          :checked="estaSelecionado(item)"
          :disabled="item.desabilitado"
          @change="aoSelecionar(item)"
        />
        <span class="pt-1 form-checked-content">
          <strong>{{ item.rotulo }}</strong>
          <small v-if="item.horario" class="d-block text-body-secondary">
            <i
              class="bi bi-calendar-event me-1"
              width="1em"
              height="1em"
              role="img"
              aria-label="Agenda"
            ></i>
            {{ item.horario }}
          </small>
        </span>
      </label>
    </div>

    <!-- checkable-radio: radio com input hidden + label estilizada -->
    <div
      v-else-if="variante === 'checkable-radio'"
      class="list-group list-group-checkable d-grid gap-2 border-0"
    >
      <template v-for="item in itens" :key="item.id">
        <input
          class="list-group-item-check pe-none"
          type="radio"
          :name="nome"
          :id="'checkable-' + item.id"
          :value="item.id"
          :checked="estaSelecionado(item)"
          :disabled="item.desabilitado"
          @change="aoSelecionar(item)"
        />
        <label class="list-group-item rounded-3 py-3" :for="'checkable-' + item.id">
          {{ item.rotulo }}
          <span v-if="item.descricao" class="d-block small opacity-50">{{ item.descricao }}</span>
        </label>
      </template>
    </div>

    <!-- radio-grid: list-group radio com input posicionado à direita -->
    <div
      v-else-if="variante === 'radio-grid'"
      class="list-group list-group-radio d-grid gap-2 border-0"
    >
      <div v-for="item in itens" :key="item.id" class="position-relative">
        <input
          class="form-check-input position-absolute top-50 end-0 me-3 fs-5"
          type="radio"
          :name="nome"
          :id="'radio-grid-' + item.id"
          :value="item.id"
          :checked="estaSelecionado(item)"
          :disabled="item.desabilitado"
          @change="aoSelecionar(item)"
        />
        <label class="list-group-item py-3 pe-5" :for="'radio-grid-' + item.id">
          <strong class="fw-semibold">{{ item.rotulo }}</strong>
          <span v-if="item.descricao" class="d-block small opacity-75">{{ item.descricao }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-group {
  width: 100%;
  max-width: 460px;
  margin-inline: 1.5rem;
}
.form-check-input:checked + .form-checked-content {
  opacity: 0.5;
}
.form-check-input-placeholder {
  border-style: dashed;
}
[contenteditable]:focus {
  outline: 0;
}
.list-group-checkable .list-group-item {
  cursor: pointer;
}
.list-group-item-check {
  position: absolute;
  clip: rect(0, 0, 0, 0);
}
.list-group-item-check:hover + .list-group-item {
  background-color: var(--bs-secondary-bg);
}
.list-group-item-check:checked + .list-group-item {
  color: #fff;
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
}
.list-group-item-check[disabled] + .list-group-item,
.list-group-item-check:disabled + .list-group-item {
  pointer-events: none;
  filter: none;
  opacity: 0.5;
}
.list-group-radio .list-group-item {
  cursor: pointer;
  border-radius: 0.5rem;
}
.list-group-radio .form-check-input {
  z-index: 2;
  margin-top: -0.5em;
}
.list-group-radio .list-group-item:hover,
.list-group-radio .list-group-item:focus {
  background-color: var(--bs-secondary-bg);
}
.list-group-radio .form-check-input:checked + .list-group-item {
  background-color: var(--bs-body);
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 2px var(--bs-primary);
}
.list-group-radio .form-check-input[disabled] + .list-group-item,
.list-group-radio .form-check-input:disabled + .list-group-item {
  pointer-events: none;
  filter: none;
  opacity: 0.5;
}
</style>
