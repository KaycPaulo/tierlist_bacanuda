<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import confetti from 'canvas-confetti'
import type { BoardItem } from '@/types/tierlist'
import AppButton from './AppButton.vue'
import AvatarCircle from './AvatarCircle.vue'

const props = defineProps<{
  open: boolean
  candidates: BoardItem[]
}>()

const emit = defineEmits<{
  confirm: [personId: string]
  cancel: []
}>()

const PEEK = 36
const GAP = 28
const LOOPS = 14
const SPIN_MS = 3800
const ITEM_SIZE_MAX = 280
const MARKER_PAD = 10

const confettiCanvasRef = ref<HTMLCanvasElement | null>(null)
const itemSize = ref(ITEM_SIZE_MAX)
const phase = ref<'spinning' | 'reveal'>('spinning')
const offsetX = ref(0)
const reelItems = ref<BoardItem[]>([])
const landingIndex = ref(0)
const selected = ref<BoardItem | null>(null)

let confettiTimer: ReturnType<typeof setTimeout> | null = null
let spinRaf = 0
let spinToken = 0
let fireLocalConfetti: confetti.CreateTypes | null = null

const step = computed(() => itemSize.value + GAP)
const viewportWidth = computed(() => itemSize.value + PEEK * 2)
const markerSize = computed(() => itemSize.value + MARKER_PAD * 2)

function resolveItemSize() {
  const available = Math.min(window.innerWidth - 64, 720) - 48
  itemSize.value = Math.max(180, Math.min(ITEM_SIZE_MAX, available - PEEK * 2))
}

function shuffleList<T>(list: T[]): T[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]!
    next[i] = next[j]!
    next[j] = tmp
  }
  return next
}

function pickWinner(candidates: BoardItem[]): BoardItem {
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

/** Embaralha a faixa e encaixa o escolhido só no índice de parada. */
function buildReel(candidates: BoardItem[], winner: BoardItem) {
  const base =
    candidates.length <= 1
      ? Array.from({ length: 10 }, () => winner)
      : candidates

  const items: BoardItem[] = []
  for (let i = 0; i < LOOPS; i += 1) {
    items.push(...shuffleList(base))
  }

  const minLand = (LOOPS - 3) * base.length
  const maxLand = Math.max(minLand, items.length - base.length - 1)
  const land = minLand + Math.floor(Math.random() * (maxLand - minLand + 1))
  items[land] = winner

  const before = shuffleList(base.filter((item) => item.personId !== winner.personId))
  for (let i = 0; i < Math.min(4, before.length); i += 1) {
    const idx = land - 1 - i
    if (idx >= 0 && before[i]) items[idx] = before[i]!
  }

  reelItems.value = items
  landingIndex.value = land
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

function clearTimers() {
  if (confettiTimer) {
    clearTimeout(confettiTimer)
    confettiTimer = null
  }
  if (spinRaf) {
    cancelAnimationFrame(spinRaf)
    spinRaf = 0
  }
  spinToken += 1
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

  confettiTimer = setTimeout(() => {
    burst(0.5, 0.42, 60)
  }, 280)
}

function computeLandingOffset() {
  const center = viewportWidth.value / 2
  const itemCenter = landingIndex.value * step.value + itemSize.value / 2
  return center - itemCenter
}

/** Rápido quase até o fim; freio bem curto e brusco. */
function spinEase(t: number): number {
  const clamp = Math.min(1, Math.max(0, t))
  const cruiseEnd = 0.86
  const cruiseDistance = 0.965
  if (clamp <= cruiseEnd) {
    return (clamp / cruiseEnd) * cruiseDistance
  }
  const u = (clamp - cruiseEnd) / (1 - cruiseEnd)
  const brake = 1 - (1 - u) * (1 - u) * (1 - u) * (1 - u)
  return cruiseDistance + (1 - cruiseDistance) * brake
}

function animateSpin(from: number, to: number, durationMs: number, token: number) {
  return new Promise<void>((resolve) => {
    const started = performance.now()

    const tick = (now: number) => {
      if (token !== spinToken) {
        resolve()
        return
      }
      const t = Math.min(1, (now - started) / durationMs)
      offsetX.value = from + (to - from) * spinEase(t)
      if (t < 1) {
        spinRaf = requestAnimationFrame(tick)
        return
      }
      offsetX.value = to
      spinRaf = 0
      resolve()
    }

    spinRaf = requestAnimationFrame(tick)
  })
}

async function startSpin() {
  if (props.candidates.length === 0) return

  clearTimers()
  const token = spinToken
  resolveItemSize()

  const winner = pickWinner(props.candidates)
  selected.value = winner
  buildReel(props.candidates, winner)
  phase.value = 'spinning'
  offsetX.value = 0

  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  if (token !== spinToken) return

  ensureConfettiCannon()

  const start = -step.value * (3 + Math.random() * 4)
  const end = computeLandingOffset()
  offsetX.value = start

  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  if (token !== spinToken) return

  await animateSpin(start, end, SPIN_MS, token)
  if (token !== spinToken) return

  phase.value = 'reveal'
  fireConfetti()
}

function resetState() {
  clearTimers()
  phase.value = 'spinning'
  offsetX.value = 0
  reelItems.value = []
  landingIndex.value = 0
  selected.value = null
  fireLocalConfetti?.reset()
  fireLocalConfetti = null
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.candidates.length > 0) {
      void startSpin()
    } else {
      resetState()
    }
  },
)

onBeforeUnmount(() => {
  resetState()
})

function onConfirm() {
  if (phase.value !== 'reveal' || !selected.value) return
  emit('confirm', selected.value.personId)
}

function onBackdropClick() {
  if (phase.value === 'reveal') emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && candidates.length > 0"
      class="roulette"
      role="dialog"
      aria-modal="true"
      aria-label="Roleta de ranqueamento"
    >
      <button
        type="button"
        class="roulette__backdrop"
        aria-label="Fechar"
        @click="onBackdropClick"
      />

      <div class="roulette__panel">
        <p class="roulette__eyebrow">
          {{ phase === 'spinning' ? 'Sorteando amigo…' : 'É a vez de' }}
        </p>

        <div
          class="roulette__stage"
          :style="{ minHeight: `${markerSize}px` }"
        >
          <div
            class="roulette__marker"
            aria-hidden="true"
            :style="{
              width: `${markerSize}px`,
              height: `${markerSize}px`,
            }"
          />
          <div
            class="roulette__viewport"
            :style="{ width: `${viewportWidth}px`, height: `${itemSize}px` }"
          >
            <div
              class="roulette__strip"
              :style="{
                gap: `${GAP}px`,
                transform: `translate3d(${offsetX}px, 0, 0)`,
              }"
            >
              <div
                v-for="(item, index) in reelItems"
                :key="`${item.personId}-${index}`"
                class="roulette__item"
                :class="{
                  'roulette__item--winner':
                    phase === 'reveal' && index === landingIndex,
                }"
                :style="{ width: `${itemSize}px`, height: `${itemSize}px` }"
              >
                <AvatarCircle
                  :image-url="item.imageUrl ?? undefined"
                  :character-name="item.username"
                  :username="item.username"
                  size="xxl"
                  :show-tooltip="false"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="roulette__result" :class="{ 'roulette__result--visible': phase === 'reveal' }">
          <template v-if="phase === 'reveal' && selected">
            <p class="roulette__name">{{ selected.username }}</p>
            <AppButton @click="onConfirm">Ranquear</AppButton>
          </template>
        </div>
      </div>

      <canvas ref="confettiCanvasRef" class="roulette__confetti" aria-hidden="true" />
    </div>
  </Teleport>
</template>

<style scoped>
.roulette {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.roulette__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: #000000;
  cursor: pointer;
}

.roulette__panel {
  position: relative;
  z-index: 1;
  width: min(720px, 100%);
  min-height: min(78vh, 640px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  background: #282828;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 2.5rem 1.75rem 2rem;
  box-sizing: border-box;
  overflow: visible;
}

.roulette__confetti {
  position: absolute;
  inset: 0;
  z-index: 5;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.roulette__eyebrow {
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.roulette__stage {
  position: relative;
  width: 100%;
  display: grid;
  place-items: center;
  overflow: visible;
}

.roulette__viewport {
  position: relative;
  z-index: 1;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.roulette__strip {
  display: flex;
  align-items: center;
  will-change: transform;
}

.roulette__item {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  opacity: 0.45;
  transform: scale(0.92);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
  filter: saturate(0.7);
}

.roulette__item :deep(.avatar-circle) {
  width: 100% !important;
  height: 100% !important;
}

.roulette__item--winner {
  opacity: 1;
  transform: scale(1);
  filter: none;
}

.roulette__marker {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 4;
  box-sizing: border-box;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.72);
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow:
    0 0 0 1px rgba(64, 136, 244, 0.35),
    inset 0 0 0 1px rgba(64, 136, 244, 0.2);
}

.roulette__result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  min-height: 96px;
}

.roulette__result--visible {
  animation: roulette-reveal 0.35s ease;
}

.roulette__name {
  margin: 0;
  font-family: var(--font-title);
  font-size: clamp(1.6rem, 3.2vw, 2.1rem);
  font-weight: 400;
  color: var(--color-text);
  text-align: center;
  line-height: 1.2;
}

@keyframes roulette-reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 520px) {
  .roulette__panel {
    min-height: min(72vh, 560px);
    padding: 1.75rem 1rem 1.5rem;
    gap: 1.5rem;
  }
}
</style>
