<script lang="ts">
export default {
  name: 'TierList',
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { DropTarget, RankName } from '../constants/ranks'
import { captureBoardPng } from '../lib/captureBoard'
import { useTierlistStore } from '../stores/tierlist'

interface GhostPos {
  left: number
  top: number
}

const store = useTierlistStore()
const boardRef = ref<HTMLElement | null>(null)
const capturing = ref(false)
const captureError = ref<string | null>(null)
const draggingId = ref<number | null>(null)
const overTier = ref<DropTarget | null>(null)
/** null = inserir no fim da fileira. */
const overBeforeId = ref<number | null>(null)
const ghostPos = ref<GhostPos | null>(null)
let dragPreviewEl: HTMLElement | null = null

const draggingItem = computed(() =>
  store.items.find((item) => item.characterId === draggingId.value) ?? null,
)

const queuePreview = computed(() => {
  if (!store.currentItem) return store.poolItems.slice(0, 4)
  return store.poolItems.slice(1, 5)
})

function clearDragPreview() {
  dragPreviewEl?.remove()
  dragPreviewEl = null
}

function resetDragState() {
  draggingId.value = null
  overTier.value = null
  overBeforeId.value = null
  ghostPos.value = null
  clearDragPreview()
}

function onDragStart(characterId: number, event: DragEvent) {
  draggingId.value = characterId
  overTier.value = null
  overBeforeId.value = null
  ghostPos.value = null
  event.dataTransfer?.setData('text/plain', String(characterId))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'

  const source = event.currentTarget as HTMLElement | null
  if (!source || !event.dataTransfer) return

  const avatarEl =
    (source.matches('.avatar') ? source : source.querySelector('.avatar')) ?? source
  const preview = avatarEl.cloneNode(true) as HTMLElement
  preview.classList.remove(
    'avatar--xl',
    'avatar--sm',
    'avatar--insert-before',
    'avatar--dragging',
  )
  preview.classList.add('avatar', 'avatar--drag-preview')
  preview.style.position = 'fixed'
  preview.style.top = '-9999px'
  preview.style.left = '-9999px'
  const size = Math.max(40, Math.round(avatarEl.getBoundingClientRect().width) || 52)
  preview.style.width = `${size}px`
  preview.style.height = `${size}px`
  preview.style.margin = '0'
  preview.style.opacity = '1'
  preview.style.pointerEvents = 'none'
  document.body.appendChild(preview)
  dragPreviewEl = preview
  event.dataTransfer.setDragImage(preview, size / 2, size / 2)
}

function onDragEnd() {
  resetDragState()
}

/**
 * Índice de inserção estável: midpoints dos avatares reais.
 * Ignora o item em drag e o fantasma absolute.
 */
function resolveInsert(
  track: HTMLElement,
  clientX: number,
  clientY: number,
): { beforeId: number | null; pos: GhostPos } {
  const trackRect = track.getBoundingClientRect()
  const avatars = [
    ...track.querySelectorAll<HTMLElement>(
      '[data-character-id]:not(.avatar--dragging):not(.avatar--ghost)',
    ),
  ]

  if (avatars.length === 0) {
    const style = getComputedStyle(track)
    return {
      beforeId: null,
      pos: {
        left: parseFloat(style.paddingLeft) || 10,
        top: parseFloat(style.paddingTop) || 8,
      },
    }
  }

  let beforeId: number | null = null
  let anchor: DOMRect | null = null

  for (const avatar of avatars) {
    const id = Number(avatar.dataset.characterId)
    if (!Number.isFinite(id)) continue
    const rect = avatar.getBoundingClientRect()
    const sameRow = Math.abs(clientY - (rect.top + rect.height / 2)) < rect.height
    if (!sameRow && clientY < rect.top) {
      beforeId = id
      anchor = rect
      break
    }
    if (sameRow && clientX < rect.left + rect.width / 2) {
      beforeId = id
      anchor = rect
      break
    }
  }

  if (anchor) {
    const slotLeft = anchor.left - trackRect.left - 30
    return {
      beforeId,
      pos: {
        left: Math.max(parseFloat(getComputedStyle(track).paddingLeft) || 0, slotLeft),
        top: anchor.top - trackRect.top,
      },
    }
  }

  const last = avatars.at(-1)
  if (!last) {
    return { beforeId: null, pos: { left: 10, top: 8 } }
  }
  const lastRect = last.getBoundingClientRect()
  return {
    beforeId: null,
    pos: {
      left: lastRect.right - trackRect.left + 8,
      top: lastRect.top - trackRect.top,
    },
  }
}

function trackFromEvent(event: DragEvent): HTMLElement | null {
  const current = event.currentTarget as HTMLElement
  if (current.classList.contains('tier__track')) return current
  return current.querySelector('.tier__track')
}

function onTierDragOver(tierName: RankName, event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'

  const track = trackFromEvent(event)
  if (!track) {
    overTier.value = tierName
    overBeforeId.value = null
    return
  }

  const { beforeId, pos } = resolveInsert(track, event.clientX, event.clientY)

  if (
    overTier.value === tierName &&
    overBeforeId.value === beforeId &&
    ghostPos.value?.left === pos.left &&
    ghostPos.value?.top === pos.top
  ) {
    return
  }

  overTier.value = tierName
  overBeforeId.value = beforeId
  ghostPos.value = pos
}

function onTierDrop(tierName: RankName, event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  const raw = event.dataTransfer?.getData('text/plain') || draggingId.value
  const characterId = Number(raw)
  const track = trackFromEvent(event)
  const beforeId = track
    ? resolveInsert(track, event.clientX, event.clientY).beforeId
    : null
  if (Number.isFinite(characterId)) {
    store.moveItem(characterId, tierName, beforeId)
  }
  resetDragState()
}

function onPoolDragOver(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  overTier.value = 'pool'
  overBeforeId.value = null
  ghostPos.value = null
}

function onPoolDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  const raw = event.dataTransfer?.getData('text/plain') || draggingId.value
  const characterId = Number(raw)
  if (Number.isFinite(characterId)) {
    store.moveItem(characterId, 'pool', null)
  }
  resetDragState()
}

function assignCurrent(rank: RankName) {
  if (!store.currentItem || draggingId.value != null) return
  store.moveItem(store.currentItem.characterId, rank)
}

function isInsertBefore(tierName: RankName, characterId: number) {
  return (
    overTier.value === tierName &&
    overBeforeId.value === characterId &&
    draggingId.value !== characterId
  )
}

async function downloadBoardPhoto() {
  if (!boardRef.value || capturing.value) return
  capturing.value = true
  captureError.value = null
  await nextTick()
  // aplica .board--capture no original só para o usuário ver o preview; a captura usa clone
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  try {
    const dataUrl = await captureBoardPng(boardRef.value)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    link.download = `tierlist-${stamp}.png`
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error('[capture]', err)
    captureError.value =
      err instanceof Error
        ? `Não foi possível gerar a foto: ${err.message}`
        : 'Não foi possível gerar a foto da tier.'
  } finally {
    capturing.value = false
  }
}
</script>

<template>
  <section class="screen">
    <div class="screen__toolbar">
      <button
        type="button"
        class="screen__photo"
        :disabled="capturing || store.loading"
        @click="downloadBoardPhoto"
      >
        {{ capturing ? 'Gerando foto...' : 'Baixar foto da tier' }}
      </button>
    </div>

    <p v-if="store.loading" class="screen__banner">Carregando...</p>
    <p v-else-if="store.error" class="screen__banner">{{ store.error }}</p>
    <p v-if="captureError" class="screen__banner">{{ captureError }}</p>

    <div class="screen__layout">
      <div ref="boardRef" class="board" :class="{ 'board--capture': capturing }">
        <div
          v-for="tier in store.tiers"
          :key="tier.name"
          class="tier"
          :class="{
            'tier--over': overTier === tier.name && !capturing,
            'tier--named': tier.name === 'BESTO',
          }"
          @dragover="onTierDragOver(tier.name, $event)"
          @drop="onTierDrop(tier.name, $event)"
          @click="assignCurrent(tier.name)"
        >
          <div
            class="tier__label"
            :class="{ 'tier__label--named': tier.name === 'BESTO' }"
            :style="{ background: tier.color }"
          >
            <span class="tier__icon" aria-hidden="true">{{ tier.icon }}</span>
            <span class="tier__text">{{ tier.label }}</span>
          </div>

          <div class="tier__track">
            <div
              v-if="overTier === tier.name && draggingItem && ghostPos"
              class="avatar avatar--ghost"
              aria-hidden="true"
              :style="{ left: `${ghostPos.left}px`, top: `${ghostPos.top}px` }"
            >
              <img
                v-if="draggingItem.imageUrl"
                :src="draggingItem.imageUrl"
                :alt="draggingItem.characterName"
              />
              <span v-else>{{ draggingItem.characterName.slice(0, 1) }}</span>
            </div>

            <div
              v-for="item in store.itemsInRank(tier.name)"
              :key="item.characterId"
              class="avatar"
              :class="{
                'avatar--dragging': draggingId === item.characterId,
                'avatar--insert-before': isInsertBefore(tier.name, item.characterId),
              }"
              draggable="true"
              :data-character-id="item.characterId"
              :title="`${item.characterName} · ${item.username}`"
              @dragstart="onDragStart(item.characterId, $event)"
              @dragend="onDragEnd"
              @click.stop
            >
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.characterName" />
              <span v-else>{{ item.characterName.slice(0, 1) }}</span>
            </div>
          </div>
        </div>
      </div>

      <aside
        class="rank-card"
        :class="{ 'rank-card--over': overTier === 'pool' }"
        @dragover="onPoolDragOver"
        @drop="onPoolDrop"
      >
        <h2 class="rank-card__title">Hora de Ranquear</h2>

        <div
          v-if="overTier === 'pool' && draggingItem && draggingId !== store.currentItem?.characterId"
          class="avatar avatar--xl avatar--ghost avatar--ghost-flow rank-card__ghost"
          aria-hidden="true"
        >
          <img
            v-if="draggingItem.imageUrl"
            :src="draggingItem.imageUrl"
            :alt="draggingItem.characterName"
          />
          <span v-else>{{ draggingItem.characterName.slice(0, 1) }}</span>
        </div>

        <div
          v-if="store.currentItem"
          class="rank-card__hero"
          :class="{ 'rank-card__hero--dragging': draggingId === store.currentItem.characterId }"
          draggable="true"
          @dragstart="onDragStart(store.currentItem.characterId, $event)"
          @dragend="onDragEnd"
        >
          <div
            class="avatar avatar--xl"
            :class="{ 'avatar--dragging': draggingId === store.currentItem.characterId }"
          >
            <img
              v-if="store.currentItem.imageUrl"
              :src="store.currentItem.imageUrl"
              :alt="store.currentItem.characterName"
            />
            <span v-else>{{ store.currentItem.characterName.slice(0, 1) }}</span>
          </div>
          <p class="rank-card__name">{{ store.currentItem.username }}</p>
          <p class="rank-card__hint">Arraste para uma fileira</p>
        </div>

        <div v-else class="rank-card__empty">
          <p>Solte aqui para ranquear de novo</p>
          <button type="button" class="rank-card__reset" @click="store.resetRankings()">
            Limpar ranking
          </button>
        </div>

        <div v-if="queuePreview.length" class="rank-card__queue" aria-label="Próximos">
          <div
            v-for="item in queuePreview"
            :key="item.characterId"
            class="avatar avatar--sm"
            :class="{ 'avatar--dragging': draggingId === item.characterId }"
            :title="item.username"
            draggable="true"
            @dragstart="onDragStart(item.characterId, $event)"
            @dragend="onDragEnd"
          >
            <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.characterName" />
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped src="./TierList.css"></style>
