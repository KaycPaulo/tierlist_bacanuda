<script lang="ts">
export default {
  name: 'TierList',
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import type { DropTarget } from '../constants/ranks'
import { captureBoardPng } from '../lib/captureBoard'
import { useTierlistStore } from '../stores/tierlist'
import AvatarCircle from './AvatarCircle.vue'
import AppButton from './AppButton.vue'
import RankRouletteModal from './RankRouletteModal.vue'
import ShimmerBlock from './ShimmerBlock.vue'

const store = useTierlistStore()

const boardRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const capturing = ref(false)
const captureError = ref<string | null>(null)
const menuOpen = ref(false)
const draggingId = ref<string | null>(null)
const overTier = ref<DropTarget | null>(null)
/** null = inserir no fim da fileira. */
const overBeforeId = ref<string | null>(null)
let dragPreviewEl: HTMLElement | null = null

const AUTO_SCROLL_EDGE = 88
const AUTO_SCROLL_MAX_SPEED = 8
const AUTO_SCROLL_MIN_SPEED = 1.2
let autoScrollRaf = 0
let lastDragClientY = 0
let smoothedScrollDelta = 0

/** Amigo liberado pela roleta para ranquear agora. */
const revealedPersonId = ref<string | null>(null)
const rouletteOpen = ref(false)

const draggingItem = computed(() =>
  store.items.find((item) => item.personId === draggingId.value) ?? null,
)

const title = computed(() => store.tierlist?.name ?? 'Tier List')

const hasRankedFriends = computed(() => store.items.some((item) => item.rank != null))

const activeItem = computed(() => {
  if (!revealedPersonId.value) return null
  return (
    store.items.find(
      (item) => item.personId === revealedPersonId.value && item.rank === null,
    ) ?? null
  )
})

const startButtonLabel = computed(() =>
  hasRankedFriends.value ? 'Voltar a ranquear' : 'Iniciar',
)

const canStartRanking = computed(
  () => !store.loading && store.poolItems.length > 0 && !activeItem.value && !rouletteOpen.value,
)

watch(
  () => store.tierlist?.id,
  () => {
    revealedPersonId.value = null
    rouletteOpen.value = false
  },
)

watch(
  () => store.items.map((item) => `${item.personId}:${item.rank ?? 'pool'}`).join('|'),
  () => {
    if (!revealedPersonId.value) return
    const stillPending = store.items.some(
      (item) => item.personId === revealedPersonId.value && item.rank === null,
    )
    if (!stillPending) revealedPersonId.value = null
  },
)

function clearDragPreview() {
  dragPreviewEl?.remove()
  dragPreviewEl = null
}

function getDragScrollTarget(): HTMLElement | null {
  const board = boardRef.value
  if (!board) return null

  const style = window.getComputedStyle(board)
  const boardScrolls =
    (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
    board.scrollHeight > board.clientHeight + 1
  if (boardScrolls) return board

  let node: HTMLElement | null = board.parentElement
  while (node && node !== document.body) {
    const nodeStyle = window.getComputedStyle(node)
    const canScroll =
      (nodeStyle.overflowY === 'auto' ||
        nodeStyle.overflowY === 'scroll' ||
        nodeStyle.overflow === 'auto') &&
      node.scrollHeight > node.clientHeight + 1
    if (canScroll) return node
    node = node.parentElement
  }

  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

function stopAutoScroll() {
  if (autoScrollRaf) {
    cancelAnimationFrame(autoScrollRaf)
    autoScrollRaf = 0
  }
  smoothedScrollDelta = 0
}

function scrollSpeedForIntensity(intensity: number) {
  // Acelera de forma suave: começa bem lento e só chega no máximo no canto.
  const eased = intensity * intensity
  return AUTO_SCROLL_MIN_SPEED + (AUTO_SCROLL_MAX_SPEED - AUTO_SCROLL_MIN_SPEED) * eased
}

function tickAutoScroll() {
  autoScrollRaf = 0
  const scroller = getDragScrollTarget()
  if (!draggingId.value || !scroller) {
    smoothedScrollDelta = 0
    return
  }

  const rect = scroller.getBoundingClientRect()
  const y = lastDragClientY
  let targetDelta = 0

  const topEdge = Math.max(rect.top, 0)
  const bottomEdge = Math.min(rect.bottom, window.innerHeight)
  const edge = Math.min(AUTO_SCROLL_EDGE, Math.max(24, (bottomEdge - topEdge) / 2.5))

  if (y < topEdge + edge) {
    const intensity = Math.min(1, Math.max(0, (topEdge + edge - y) / edge))
    targetDelta = -scrollSpeedForIntensity(intensity)
  } else if (y > bottomEdge - edge) {
    const intensity = Math.min(1, Math.max(0, (y - (bottomEdge - edge)) / edge))
    targetDelta = scrollSpeedForIntensity(intensity)
  } else if (y < edge) {
    const intensity = Math.min(1, Math.max(0, (edge - y) / edge))
    targetDelta = -scrollSpeedForIntensity(intensity)
  } else if (y > window.innerHeight - edge) {
    const intensity = Math.min(1, Math.max(0, (y - (window.innerHeight - edge)) / edge))
    targetDelta = scrollSpeedForIntensity(intensity)
  }

  // Interpola a velocidade para o movimento não "pular".
  smoothedScrollDelta += (targetDelta - smoothedScrollDelta) * 0.18

  if (Math.abs(smoothedScrollDelta) > 0.15 || targetDelta !== 0) {
    scroller.scrollTop += smoothedScrollDelta
    autoScrollRaf = requestAnimationFrame(tickAutoScroll)
  } else {
    smoothedScrollDelta = 0
  }
}

function updateDragScrollPosition(clientY: number) {
  lastDragClientY = clientY
  if (!draggingId.value || !getDragScrollTarget()) return
  if (!autoScrollRaf) {
    autoScrollRaf = requestAnimationFrame(tickAutoScroll)
  }
}

function onDocumentDragOver(event: DragEvent) {
  if (!draggingId.value) return
  // Necessário para o browser continuar emitindo dragover fora dos drop targets.
  event.preventDefault()
  updateDragScrollPosition(event.clientY)
}

function onDocumentWheelWhileDragging(event: WheelEvent) {
  if (!draggingId.value) return
  const scroller = getDragScrollTarget()
  if (!scroller) return
  event.preventDefault()
  scroller.scrollTop += event.deltaY * 0.45
}

function resetDragState() {
  draggingId.value = null
  overTier.value = null
  overBeforeId.value = null
  stopAutoScroll()
  clearDragPreview()
}

function onDragStart(personId: string, event: DragEvent) {
  draggingId.value = personId
  overTier.value = null
  overBeforeId.value = null
  lastDragClientY = event.clientY
  event.dataTransfer?.setData('text/plain', personId)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'

  document.addEventListener('dragover', onDocumentDragOver, true)
  document.addEventListener('wheel', onDocumentWheelWhileDragging, {
    passive: false,
    capture: true,
  })

  const source = event.currentTarget as HTMLElement | null
  if (!source || !event.dataTransfer) return

  const avatarEl = source.querySelector('.avatar-circle') ?? source
  const preview = avatarEl.cloneNode(true) as HTMLElement
  preview.classList.add('avatar-circle--drag-preview')
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

function detachDragScrollListeners() {
  document.removeEventListener('dragover', onDocumentDragOver, true)
  document.removeEventListener('wheel', onDocumentWheelWhileDragging, true)
}

function onDragEnd() {
  detachDragScrollListeners()
  resetDragState()
}

/**
 * Índice de inserção estável: midpoints dos avatares reais.
 * Ignora o item em drag e o fantasma no fluxo.
 */
function resolveInsertBeforeId(
  track: HTMLElement,
  clientX: number,
  clientY: number,
): string | null {
  const avatars = [
    ...track.querySelectorAll<HTMLElement>(
      '[data-person-id]:not(.tier-avatar--dragging):not(.avatar-ghost)',
    ),
  ]

  for (const avatar of avatars) {
    const id = avatar.dataset.personId
    if (!id) continue
    const rect = avatar.getBoundingClientRect()
    const sameRow = Math.abs(clientY - (rect.top + rect.height / 2)) < rect.height
    if (!sameRow && clientY < rect.top) return id
    if (sameRow && clientX < rect.left + rect.width / 2) return id
  }

  return null
}

function trackFromEvent(event: DragEvent): HTMLElement | null {
  const current = event.currentTarget as HTMLElement
  if (current.classList.contains('tier__track')) return current
  return current.querySelector('.tier__track')
}

function onTierDragOver(tierName: string, event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  updateDragScrollPosition(event.clientY)

  const track = trackFromEvent(event)
  if (!track) {
    overTier.value = tierName
    overBeforeId.value = null
    return
  }

  const beforeId = resolveInsertBeforeId(track, event.clientX, event.clientY)
  overTier.value = tierName
  overBeforeId.value = beforeId
}

function onTierDrop(tierName: string, event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  const personId = event.dataTransfer?.getData('text/plain') || draggingId.value
  const track = trackFromEvent(event)
  const beforeId = track
    ? resolveInsertBeforeId(track, event.clientX, event.clientY)
    : null
  if (personId) {
    store.moveItem(personId, tierName, beforeId)
  }
  resetDragState()
}

function onPoolDragOver(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  updateDragScrollPosition(event.clientY)
  overTier.value = 'pool'
  overBeforeId.value = null
}

function onPoolDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  const personId = event.dataTransfer?.getData('text/plain') || draggingId.value
  if (personId) {
    store.moveItem(personId, 'pool', null)
    revealedPersonId.value = personId
    rouletteOpen.value = false
  }
  resetDragState()
}

function assignCurrent(rank: string) {
  if (!activeItem.value || draggingId.value != null) return
  store.moveItem(activeItem.value.personId, rank)
}

function openRankingRoulette() {
  if (!canStartRanking.value) return
  rouletteOpen.value = true
}

function confirmRoulettePick(personId: string) {
  revealedPersonId.value = personId
  rouletteOpen.value = false
}

function cancelRoulette() {
  rouletteOpen.value = false
}

function isInsertBefore(tierName: string, personId: string) {
  return (
    overTier.value === tierName &&
    overBeforeId.value === personId &&
    draggingId.value !== personId
  )
}

function showGhostAtEnd(tierName: string) {
  return (
    overTier.value === tierName &&
    draggingItem.value != null &&
    overBeforeId.value === null
  )
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!menuOpen.value || !menuRef.value) return
  if (!menuRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

async function downloadBoardPhoto() {
  closeMenu()
  if (!boardRef.value || capturing.value) return
  capturing.value = true
  captureError.value = null
  await nextTick()
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

async function saveTierList() {
  closeMenu()
  try {
    await store.saveBoard()
  } catch {
    // erro já no store
  }
}

function resetTierList() {
  closeMenu()
  const confirmed = confirm('Resetar a tier list? Todos os amigos voltam para a fila.')
  if (!confirmed) return
  store.resetRankings()
  revealedPersonId.value = null
  rouletteOpen.value = false
}

onBeforeRouteLeave(async () => {
  if (!store.dirty) return true
  try {
    await store.saveBoard()
    return true
  } catch {
    return confirm('Não foi possível salvar. Sair mesmo assim?')
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  detachDragScrollListeners()
  stopAutoScroll()
  clearDragPreview()
})
</script>

<template>
  <section class="screen">
    <p v-if="store.error && !store.loading" class="screen__banner">{{ store.error }}</p>
    <p v-if="captureError" class="screen__banner">{{ captureError }}</p>

    <div
      v-if="store.loading"
      class="board board--shimmer"
      aria-busy="true"
      aria-label="Carregando tier list"
    >
      <div v-for="n in 6" :key="n" class="tier-shimmer">
        <ShimmerBlock width="104px" height="72px" radius="14px 0 0 14px" />
        <div class="tier-shimmer__track">
          <ShimmerBlock v-for="i in 4" :key="i" width="56px" height="56px" radius="50%" />
        </div>
      </div>
    </div>

    <div v-else class="screen__layout">
      <header class="screen__header">
        <h1 class="screen__title">{{ title }}</h1>
      </header>

      <div ref="menuRef" class="screen__menu">
        <button
          type="button"
          class="screen__menu-btn"
          aria-label="Opções da tier list"
          :aria-expanded="menuOpen"
          @click="toggleMenu"
        >
          <span class="screen__menu-icon" aria-hidden="true">
            <span class="screen__menu-line">
              <span class="screen__menu-knob screen__menu-knob--top" />
            </span>
            <span class="screen__menu-line">
              <span class="screen__menu-knob screen__menu-knob--bottom" />
            </span>
          </span>
        </button>

        <div v-if="menuOpen" class="screen__menu-panel" role="menu">
          <button
            type="button"
            class="screen__menu-item"
            role="menuitem"
            :disabled="store.saving || store.loading"
            @click="saveTierList"
          >
            {{ store.saving ? 'Salvando...' : 'Salvar Tier list' }}
          </button>
          <button
            type="button"
            class="screen__menu-item"
            role="menuitem"
            :disabled="capturing || store.loading"
            @click="downloadBoardPhoto"
          >
            {{ capturing ? 'Gerando foto...' : 'Baixar foto da tier list' }}
          </button>
          <button
            type="button"
            class="screen__menu-item screen__menu-item--danger"
            role="menuitem"
            :disabled="store.loading"
            @click="resetTierList"
          >
            Resetar Tier List
          </button>
        </div>
      </div>

      <div ref="boardRef" class="board" :class="{ 'board--capture': capturing }">
        <div
          v-for="tier in store.tiers"
          :key="tier.name"
          class="tier"
          :class="{ 'tier--over': overTier === tier.name && !capturing }"
          @dragover="onTierDragOver(tier.name, $event)"
          @drop="onTierDrop(tier.name, $event)"
          @click="assignCurrent(tier.name)"
        >
          <div class="tier__label" :style="{ background: tier.color }">
            <img :src="`/${tier.icon}`" :alt="tier.name" class="tier__icon" />
            <span class="tier__text">{{ tier.name }}</span>
          </div>

          <div class="tier__track">
            <template v-for="item in store.itemsInRank(tier.name)" :key="item.personId">
              <div
                v-if="isInsertBefore(tier.name, item.personId) && draggingItem"
                class="avatar-ghost avatar-ghost--flow"
                aria-hidden="true"
              >
                <AvatarCircle
                  :image-url="draggingItem.imageUrl ?? undefined"
                  :character-name="draggingItem.username"
                  :username="draggingItem.username"
                  size="sm"
                  :show-tooltip="false"
                />
              </div>

              <div
                class="tier-avatar"
                :class="{
                  'tier-avatar--dragging': draggingId === item.personId,
                }"
                draggable="true"
                :data-person-id="item.personId"
                @dragstart="onDragStart(item.personId, $event)"
                @dragend="onDragEnd"
                @click.stop
              >
                <AvatarCircle
                  :image-url="item.imageUrl ?? undefined"
                  :character-name="item.username"
                  :username="item.username"
                  size="sm"
                  :draggable="true"
                />
              </div>
            </template>

            <div
              v-if="showGhostAtEnd(tier.name) && draggingItem"
              class="avatar-ghost avatar-ghost--flow"
              aria-hidden="true"
            >
              <AvatarCircle
                :image-url="draggingItem.imageUrl ?? undefined"
                :character-name="draggingItem.username"
                :username="draggingItem.username"
                size="sm"
                :show-tooltip="false"
              />
            </div>
          </div>
        </div>
      </div>

      <aside class="rank-panel">
        <div v-if="store.author" class="host-card">
          <AvatarCircle
            :image-url="store.author.avatar_url ?? undefined"
            :character-name="store.authorLabel || store.author.username"
            :username="store.author.username"
            size="sm"
            :show-tooltip="false"
          />
          <div class="host-card__text">
            <p class="host-card__title">Host</p>
            <p class="host-card__name">{{ store.authorLabel }}</p>
          </div>
        </div>

        <div
          class="rank-card"
          :class="{ 'rank-card--over': overTier === 'pool' }"
          @dragover="onPoolDragOver"
          @drop="onPoolDrop"
        >
          <h2 class="rank-card__title">Hora de Ranquear</h2>

          <div
            v-if="overTier === 'pool' && draggingItem && draggingId !== activeItem?.personId"
            class="avatar-ghost avatar-ghost--flow rank-card__ghost"
            aria-hidden="true"
          >
            <AvatarCircle
              :image-url="draggingItem.imageUrl ?? undefined"
              :character-name="draggingItem.username"
              :username="draggingItem.username"
              size="xl"
              :show-tooltip="false"
            />
          </div>

          <div
            v-if="activeItem"
            class="rank-card__hero"
            :class="{ 'rank-card__hero--dragging': draggingId === activeItem.personId }"
            draggable="true"
            @dragstart="onDragStart(activeItem.personId, $event)"
            @dragend="onDragEnd"
          >
            <AvatarCircle
              :image-url="activeItem.imageUrl ?? undefined"
              :character-name="activeItem.username"
              :username="activeItem.username"
              size="xl"
              :draggable="true"
            />
            <p class="rank-card__name">{{ activeItem.username }}</p>
          </div>

          <div v-else-if="store.poolItems.length > 0" class="rank-card__ready">
            <p class="rank-card__hint">
              {{
                hasRankedFriends
                  ? 'Pronto para o próximo amigo'
                  : 'Embaralhe e descubra quem ranquear'
              }}
            </p>
            <AppButton :disabled="!canStartRanking" @click="openRankingRoulette">
              {{ startButtonLabel }}
            </AppButton>
          </div>

          <div v-else class="rank-card__empty">
            <p>Todos ranqueados</p>
            <p class="rank-card__hint">Solte aqui para ranquear de novo</p>
          </div>
        </div>
      </aside>
    </div>

    <RankRouletteModal
      :open="rouletteOpen"
      :candidates="store.poolItems"
      @confirm="confirmRoulettePick"
      @cancel="cancelRoulette"
    />
  </section>
</template>

<style scoped src="./TierList.css"></style>
