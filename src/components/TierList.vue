<script lang="ts">
export default {
  name: 'TierList',
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import confetti from 'canvas-confetti'
import type { DropTarget } from '../constants/ranks'
import { captureBoardPng } from '../lib/captureBoard'
import { useTierlistStore } from '../stores/tierlist'
import { reactionBroadcastService } from '../services/reactionBroadcast'
import AvatarCircle from './AvatarCircle.vue'
import AppButton from './AppButton.vue'
import RankRouletteModal from './RankRouletteModal.vue'
import ShimmerBlock from './ShimmerBlock.vue'

const store = useTierlistStore()
const router = useRouter()

const boardRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const confettiCanvasRef = ref<HTMLCanvasElement | null>(null)
const capturing = ref(false)
const captureError = ref<string | null>(null)
const menuOpen = ref(false)
const reactionsMuted = ref(false)
const draggingId = ref<string | null>(null)
const overTier = ref<DropTarget | null>(null)
/** null = inserir no fim da fileira. */
const overBeforeId = ref<string | null>(null)
const showFlash = ref(false)
let dragPreviewEl: HTMLElement | null = null
let fireLocalConfetti: confetti.CreateTypes | null = null
let confettiTimer: ReturnType<typeof setTimeout> | null = null

const AUTO_SCROLL_EDGE = 88
const AUTO_SCROLL_MAX_SPEED = 8
const AUTO_SCROLL_MIN_SPEED = 1.2
let autoScrollRaf = 0
let lastDragClientY = 0
let smoothedScrollDelta = 0

/** Amigo liberado pela roleta para ranquear agora. */
const revealedPersonId = ref<string | null>(null)
const rouletteOpen = ref(false)
const lastRanked = ref<{
  personId: string
  username: string
  tierName: string
  tierIcon: string
} | null>(null)

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
  () =>
    !store.loading &&
    store.poolItems.length > 0 &&
    !activeItem.value &&
    !rouletteOpen.value &&
    !lastRanked.value,
)

const allFriendsRanked = computed(
  () => !store.loading && store.items.length > 0 && store.poolItems.length === 0,
)

const finalizing = ref(false)
const isFinalized = ref(false)
const hasUserChangedRankings = ref(false)

watch(
  () => store.tierlist?.id,
  () => {
    revealedPersonId.value = null
    rouletteOpen.value = false
    lastRanked.value = null
    hasUserChangedRankings.value = false
    
    // Ao carregar uma tier list, verifica se deve iniciar como finalizada
    // Se todos já estão ranqueados e não está dirty (não há mudanças pendentes),
    // significa que é uma tier list já finalizada anteriormente
    nextTick(() => {
      if (allFriendsRanked.value && !store.dirty) {
        isFinalized.value = true
      } else {
        isFinalized.value = false
      }
    })
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

// Monitora mudanças nos rankings durante a sessão
watch(
  () => store.items.map((item) => `${item.personId}:${item.rank ?? 'pool'}`).join('|'),
  (newVal, oldVal) => {
    // Se houve mudança e não é a carga inicial
    if (oldVal && newVal !== oldVal) {
      hasUserChangedRankings.value = true
      // Se estava finalizada e mudamos algo, remove o estado de finalizada
      if (isFinalized.value && !allFriendsRanked.value) {
        isFinalized.value = false
      }
    }
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
    const item = store.items.find((entry) => entry.personId === personId)
    const wasUnranked = item?.rank === null
    store.moveItem(personId, tierName, beforeId)
    if (item && (wasUnranked || lastRanked.value?.personId === personId)) {
      markRankedSuccess(item.personId, item.username, tierName)
    }
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
    lastRanked.value = null
    rouletteOpen.value = false
  }
  resetDragState()
}

function markRankedSuccess(personId: string, username: string, tierName: string) {
  const tier = store.tiers.find((entry) => entry.name === tierName)
  revealedPersonId.value = null
  lastRanked.value = {
    personId,
    username,
    tierName,
    tierIcon: tier?.icon ?? '',
  }
}

function assignCurrent(rank: string) {
  if (draggingId.value != null) return

  if (activeItem.value) {
    const item = activeItem.value
    store.moveItem(item.personId, rank)
    markRankedSuccess(item.personId, item.username, rank)
    return
  }

  // Com o card de sucesso aberto, clicar numa tier reposiciona esse amigo.
  if (lastRanked.value) {
    const { personId, username } = lastRanked.value
    store.moveItem(personId, rank)
    markRankedSuccess(personId, username, rank)
  }
}

function openRankingRoulette() {
  if (!canStartRanking.value) return
  lastRanked.value = null
  rouletteOpen.value = true
}

function confirmRoulettePick(personId: string) {
  revealedPersonId.value = personId
  lastRanked.value = null
  rouletteOpen.value = false
}

function cancelRoulette() {
  rouletteOpen.value = false
}

function goToNextRanking() {
  lastRanked.value = null
  if (store.poolItems.length === 0) return
  rouletteOpen.value = true
}

function ensureConfettiCannon() {
  const canvas = confettiCanvasRef.value
  if (!canvas) return null
  if (!fireLocalConfetti) {
    fireLocalConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    })
  }
  return fireLocalConfetti
}

function fireConfetti() {
  const cannon = ensureConfettiCannon()
  if (!cannon) return

  const burst = (originX: number, originY: number, count: number) => {
    cannon({
      particleCount: count,
      spread: 68,
      startVelocity: 42,
      gravity: 1.05,
      ticks: 180,
      origin: { x: originX, y: originY },
      colors: ['#4088f4', '#41e0e0', '#ffdb5e', '#2ee512', '#ff8f8f', '#ffffff'],
      disableForReducedMotion: true,
    })
  }

  burst(0.12, 0.28, 80)
  burst(0.88, 0.28, 80)
  burst(0.5, 0.18, 100)
  burst(0.28, 0.55, 50)
  burst(0.72, 0.55, 50)

  if (confettiTimer) clearTimeout(confettiTimer)
  confettiTimer = setTimeout(() => {
    burst(0.5, 0.42, 60)
  }, 280)
}

async function triggerCameraFlash() {
  showFlash.value = true
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 150))
  showFlash.value = false
}

async function capturePhotoAutomatically() {
  if (!boardRef.value || capturing.value) return
  capturing.value = true
  captureError.value = null
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  try {
    await triggerCameraFlash()
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

async function takePhotoFromFinalized() {
  await capturePhotoAutomatically()
}

async function finalizeTierList() {
  if (finalizing.value) return
  finalizing.value = true
  try {
    await store.saveBoard()
    
    // Marca explicitamente como finalizada
    isFinalized.value = true
    
    // Dispara confete
    fireConfetti()
    
    // Aguarda um pouco para o confete começar
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    // Captura a foto automaticamente
    await capturePhotoAutomatically()
  } catch {
    // erro já no store
  } finally {
    finalizing.value = false
  }
}

function isInsertBefore(tierName: string, personId: string) {
  return (
    overTier.value === tierName &&
    overBeforeId.value === personId &&
    draggingId.value !== personId
  )
}

/** Evita fantasma colado no próprio item cinza quando a posição não mudaria. */
function isNoOpInsertBefore(tierName: string, beforePersonId: string) {
  const dragging = draggingItem.value
  if (!dragging || dragging.rank !== tierName) return false
  const list = store.itemsInRank(tierName)
  const from = list.findIndex((item) => item.personId === dragging.personId)
  const to = list.findIndex((item) => item.personId === beforePersonId)
  return from >= 0 && to >= 0 && from === to - 1
}

function isNoOpInsertAtEnd(tierName: string) {
  const dragging = draggingItem.value
  if (!dragging || dragging.rank !== tierName) return false
  const list = store.itemsInRank(tierName)
  return list.length > 0 && list[list.length - 1]!.personId === dragging.personId
}

function shouldShowGhostBefore(tierName: string, personId: string) {
  return (
    isInsertBefore(tierName, personId) &&
    draggingItem.value != null &&
    !isNoOpInsertBefore(tierName, personId)
  )
}

function showGhostAtEnd(tierName: string) {
  return (
    overTier.value === tierName &&
    draggingItem.value != null &&
    overBeforeId.value === null &&
    !isNoOpInsertAtEnd(tierName)
  )
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function toggleReactionsMute() {
  reactionsMuted.value = reactionBroadcastService.toggleMuted()
  closeMenu()
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
    await triggerCameraFlash()
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
  lastRanked.value = null
  isFinalized.value = false
  hasUserChangedRankings.value = true
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
  reactionBroadcastService.start()
  reactionsMuted.value = reactionBroadcastService.isMuted()
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  detachDragScrollListeners()
  stopAutoScroll()
  clearDragPreview()
  reactionBroadcastService.stop()
  reactionsMuted.value = false
  if (confettiTimer) clearTimeout(confettiTimer)
  fireLocalConfetti?.reset()
  fireLocalConfetti = null
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
          <svg
            class="screen__menu-icon"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 0 0-.12-.61l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"
            />
          </svg>
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
            class="screen__menu-item"
            role="menuitem"
            @click="toggleReactionsMute"
          >
            {{ reactionsMuted ? 'Escutar Reações' : 'Silenciar Reações' }}
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
                v-if="shouldShowGhostBefore(tier.name, item.personId) && draggingItem"
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
          :class="{ 'rank-card--over': overTier === 'pool' && !isFinalized }"
          @dragover="!isFinalized && onPoolDragOver($event)"
          @drop="!isFinalized && onPoolDrop($event)"
        >
          <h2 v-if="!isFinalized" class="rank-card__title">Hora de Ranquear</h2>

          <div v-if="isFinalized" class="rank-card__finalized">
            <div class="rank-card__finalized-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="64" height="64" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                />
              </svg>
            </div>
            <h2 class="rank-card__finalized-title">Tier List Finalizada</h2>
            <p class="rank-card__finalized-text">Sua tier list foi salva com sucesso!</p>
            <div class="rank-card__finalized-actions">
              <AppButton
                :disabled="capturing"
                @click="takePhotoFromFinalized"
              >
                {{ capturing ? 'Gerando foto...' : 'Tirar Foto' }}
              </AppButton>
              <AppButton
                variant="secondary"
                @click="resetTierList"
              >
                Resetar Tier List
              </AppButton>
            </div>
          </div>

          <div v-else-if="lastRanked" class="rank-card__success">
            <div class="rank-card__success-badge" aria-hidden="true">
              <span class="rank-card__success-check">
                <svg viewBox="0 0 16 16" width="48" height="48" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06L7 9.94l5.72-5.72a.75.75 0 0 1 1.06 0Z"
                  />
                </svg>
              </span>
            </div>
            <p class="rank-card__success-text">
              <span class="rank-card__success-line">{{ lastRanked.username }} ranqueado em</span>
              <span class="rank-card__success-tier">
                <img
                  v-if="lastRanked.tierIcon"
                  :src="`/${lastRanked.tierIcon}`"
                  :alt="lastRanked.tierName"
                  class="rank-card__success-tier-icon"
                />
                <span>{{ lastRanked.tierName }}</span>
              </span>
            </p>
            <AppButton
              v-if="store.poolItems.length > 0"
              @click="goToNextRanking"
            >
              Próximo
            </AppButton>
            <AppButton
              v-else
              :disabled="finalizing || store.saving"
              @click="finalizeTierList"
            >
              {{ finalizing || store.saving ? 'Finalizando...' : 'Finalizar Tier List' }}
            </AppButton>
          </div>

          <div
            v-else-if="overTier === 'pool' && draggingItem && draggingId !== activeItem?.personId"
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
            v-else-if="activeItem"
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
            <AppButton
              v-if="allFriendsRanked"
              :disabled="finalizing || store.saving"
              @click="finalizeTierList"
            >
              {{ finalizing || store.saving ? 'Finalizando...' : 'Finalizar Tier List' }}
            </AppButton>
            <p v-else class="rank-card__hint">Solte aqui para ranquear de novo</p>
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

    <canvas ref="confettiCanvasRef" class="tierlist__confetti" aria-hidden="true" />
    
    <div v-if="showFlash" class="camera-flash" aria-hidden="true" />
  </section>
</template>

<style scoped src="./TierList.css"></style>
