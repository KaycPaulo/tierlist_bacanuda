<script lang="ts">
export default {
  name: 'TierList',
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import type { DropTarget } from '../constants/ranks'
import { useTierlistStore } from '../stores/tierlist'

const store = useTierlistStore()
const draggingId = ref<number | null>(null)
const overTier = ref<DropTarget | null>(null)

function onDragStart(characterId: number, event: DragEvent) {
  draggingId.value = characterId
  event.dataTransfer?.setData('text/plain', String(characterId))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  draggingId.value = null
  overTier.value = null
}

function onDragOver(target: DropTarget, event: DragEvent) {
  event.preventDefault()
  overTier.value = target
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function onDragLeave(target: DropTarget) {
  if (overTier.value === target) overTier.value = null
}

async function onDrop(target: DropTarget, event: DragEvent) {
  event.preventDefault()
  const rawId = event.dataTransfer?.getData('text/plain') || draggingId.value
  const characterId = Number(rawId)
  if (Number.isFinite(characterId)) await store.moveItem(characterId, target)
  draggingId.value = null
  overTier.value = null
}
</script>

<template>
  <section class="tierlist">
    <header class="tierlist__header">
      <div>
        <p class="tierlist__brand">Tierlist</p>
        <h1>{{ store.tierlist?.name ?? 'Monte seu ranking' }}</h1>
        <p class="tierlist__hint">
          <template v-if="store.person">Como {{ store.person.username }} — </template>
          arraste os personagens vinculados às pessoas
        </p>
      </div>
      <button
        type="button"
        class="tierlist__reset"
        :disabled="store.loading || !store.tierlist"
        @click="store.resetRankings()"
      >
        Limpar ranking
      </button>
    </header>

    <p v-if="store.error" class="tierlist__status tierlist__status--error">{{ store.error }}</p>
    <p v-else-if="store.loading" class="tierlist__status">Carregando do Supabase...</p>
    <p v-else-if="store.usingLocalMock" class="tierlist__status">
      Exibindo pessoas/personagens mockados localmente
    </p>

    <div v-if="store.tiers.length" class="tierlist__board">
      <div
        v-for="tier in store.tiers"
        :key="tier.name"
        class="tier-row"
        :class="{ 'tier-row--over': overTier === tier.name }"
        @dragover="onDragOver(tier.name, $event)"
        @dragleave="onDragLeave(tier.name)"
        @drop="onDrop(tier.name, $event)"
      >
        <div class="tier-row__label" :style="{ background: tier.color }" :title="tier.name">
          <span>{{ tier.icon }}</span>
        </div>
        <div class="tier-row__items">
          <button
            v-for="item in store.itemsInRank(tier.name)"
            :key="item.characterId"
            type="button"
            class="chip"
            :class="{ 'chip--dragging': draggingId === item.characterId }"
            draggable="true"
            @dragstart="onDragStart(item.characterId, $event)"
            @dragend="onDragEnd"
          >
            <img
              v-if="item.imageUrl"
              class="chip__image"
              :src="item.imageUrl"
              :alt="item.characterName"
            />
            <span class="chip__meta">
              <span class="chip__name">{{ item.characterName }}</span>
              <span class="chip__user">{{ item.username }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <div
      class="pool"
      :class="{ 'pool--over': overTier === 'pool' }"
      @dragover="onDragOver('pool', $event)"
      @dragleave="onDragLeave('pool')"
      @drop="onDrop('pool', $event)"
    >
      <div class="pool__top">
        <h2>Não ranqueados</h2>
      </div>
      <div class="pool__items">
        <button
          v-for="item in store.poolItems"
          :key="item.characterId"
          type="button"
          class="chip"
          :class="{ 'chip--dragging': draggingId === item.characterId }"
          draggable="true"
          @dragstart="onDragStart(item.characterId, $event)"
          @dragend="onDragEnd"
        >
          <img
            v-if="item.imageUrl"
            class="chip__image"
            :src="item.imageUrl"
            :alt="item.characterName"
          />
          <span class="chip__meta">
            <span class="chip__name">{{ item.characterName }}</span>
            <span class="chip__user">{{ item.username }}</span>
          </span>
        </button>
        <p v-if="!store.loading && store.poolItems.length === 0" class="pool__empty">
          Todos ranqueados — solte aqui para remover do ranking
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped src="./TierList.css"></style>
