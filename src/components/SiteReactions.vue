<script lang="ts">
export default {
  name: 'SiteReactions',
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { REACTIONS, type ReactionId } from '../constants/reactions'
import { SOUND_PHRASES } from '../constants/soundPhrases'
import {
  playPhrase,
  playReaction,
  subscribeReactionPlays,
  subscribePhrasePlays,
  type ReactionPlayEvent,
  type PhrasePlayEvent,
} from '../services/reactionPlayer'
import { useTierlistStore } from '../stores/tierlist'

interface FlyingReaction {
  key: number
  id: ReactionId
  emoji: string
  label: string
  color: string
  mode: 'small' | 'big'
  leftPct: number
  risePct: number
  senderName?: string
}

interface FlyingPhrase {
  key: number
  emoji: string
  label: string
  mode: 'small' | 'big'
  leftPct: number
  risePct: number
  senderName?: string
}

interface TomatoStain {
  key: number
  left: number
  top: number
  size: number
  rotate: number
  delay: number
  drip: number
  opacity: number
}

interface FingerBurst {
  key: number
  left: number
  top: number
  size: number
  rotate: number
  delay: number
}

const tierlistStore = useTierlistStore()

let nextKey = 0
const flying = ref<FlyingReaction[]>([])
const flyingPhrases = ref<FlyingPhrase[]>([])
const tomatoStains = ref<TomatoStain[]>([])
const fingers = ref<FingerBurst[]>([])
const flashColor = ref<string | null>(null)
const showPhrases = ref(false)
const isFlipping = ref(false)
const timers = new Set<number>()
let flashTimer: number | null = null
let unsubscribeReactions: (() => void) | null = null
let unsubscribePhrases: (() => void) | null = null

const hostName = computed(() => tierlistStore.authorLabel ?? undefined)

const smallFlying = computed(() => flying.value.filter((entry) => entry.mode === 'small'))
const bigFlying = computed(() => flying.value.filter((entry) => entry.mode === 'big'))
const smallPhrases = computed(() => flyingPhrases.value.filter((entry) => entry.mode === 'small'))
const bigPhrases = computed(() => flyingPhrases.value.filter((entry) => entry.mode === 'big'))

async function toggleDockMode() {
  if (isFlipping.value) return
  isFlipping.value = true
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 220)
  })
  showPhrases.value = !showPhrases.value
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  isFlipping.value = false
}

function clearFlash() {
  flashColor.value = null
  document.documentElement.style.removeProperty('--reaction-flash')
  document.documentElement.classList.remove('reaction-flash')
  if (flashTimer != null) {
    window.clearTimeout(flashTimer)
    flashTimer = null
  }
}

function flashBorders(color: string, duration = 1400) {
  flashColor.value = color
  document.documentElement.style.setProperty('--reaction-flash', color)
  document.documentElement.classList.add('reaction-flash')

  if (flashTimer != null) window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => {
    clearFlash()
  }, duration)
}

function spawnTomatoStains() {
  const batchKey = ++nextKey
  const stains: TomatoStain[] = []

  // Grade cobrindo a tela inteira + alguns extras aleatórios
  const cols = 4
  const rows = 4
  let index = 0

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cellLeft = (col / cols) * 100
      const cellTop = (row / rows) * 100

      stains.push({
        key: batchKey * 100 + index,
        left: cellLeft + 4 + Math.random() * 14,
        top: cellTop + 2 + Math.random() * 14,
        size: 120 + Math.random() * 160,
        rotate: -40 + Math.random() * 80,
        delay: 0.02 + index * 0.02 + Math.random() * 0.08,
        drip: 90 + Math.random() * 140,
        opacity: 0.5 + Math.random() * 0.35,
      })
      index += 1
    }
  }

  for (let i = 0; i < 6; i += 1) {
    stains.push({
      key: batchKey * 100 + index + i,
      left: Math.random() * 92,
      top: Math.random() * 88,
      size: 100 + Math.random() * 180,
      rotate: -45 + Math.random() * 90,
      delay: 0.1 + Math.random() * 0.25,
      drip: 80 + Math.random() * 150,
      opacity: 0.45 + Math.random() * 0.35,
    })
  }

  tomatoStains.value.push(...stains)

  const timer = window.setTimeout(() => {
    const stainKeys = new Set(stains.map((stain) => stain.key))
    tomatoStains.value = tomatoStains.value.filter((stain) => !stainKeys.has(stain.key))
    timers.delete(timer)
  }, 3200)

  timers.add(timer)
}

function spawnFingers() {
  const batchKey = ++nextKey
  const items: FingerBurst[] = []

  for (let i = 0; i < 14; i += 1) {
    items.push({
      key: batchKey * 100 + i,
      left: Math.random() * 88,
      top: Math.random() * 78,
      size: 48 + Math.random() * 72,
      rotate: -25 + Math.random() * 50,
      delay: Math.random() * 0.35,
    })
  }

  fingers.value.push(...items)

  const timer = window.setTimeout(() => {
    const keys = new Set(items.map((item) => item.key))
    fingers.value = fingers.value.filter((item) => !keys.has(item.key))
    timers.delete(timer)
  }, 2200)

  timers.add(timer)
}

function onReactionPlay(event: ReactionPlayEvent) {
  const key = ++nextKey
  flying.value.push({
    key,
    id: event.id,
    emoji: event.emoji,
    label: event.label,
    color: event.color,
    mode: event.mode,
    leftPct: event.leftPct,
    risePct: event.risePct,
    senderName: event.senderName,
  })

  if (event.mode === 'big') {
    flashBorders(event.color, event.durationMs)
    if (event.id === 'tomato') spawnTomatoStains()
    if (event.id === 'swear') spawnFingers()
  }

  const timer = window.setTimeout(() => {
    flying.value = flying.value.filter((entry) => entry.key !== key)
    timers.delete(timer)
  }, event.durationMs)

  timers.add(timer)
}

function onPhrasePlay(event: PhrasePlayEvent) {
  const key = ++nextKey
  flyingPhrases.value.push({
    key,
    emoji: event.emoji,
    label: event.label,
    mode: event.mode,
    leftPct: event.leftPct,
    risePct: event.risePct,
    senderName: event.senderName,
  })

  if (event.mode === 'big') {
    flashBorders('#f59e0b', event.durationMs)
  }

  const timer = window.setTimeout(() => {
    flyingPhrases.value = flyingPhrases.value.filter((entry) => entry.key !== key)
    timers.delete(timer)
  }, event.durationMs)

  timers.add(timer)
}

onMounted(() => {
  unsubscribeReactions = subscribeReactionPlays(onReactionPlay)
  unsubscribePhrases = subscribePhrasePlays(onPhrasePlay)
})

onBeforeUnmount(() => {
  unsubscribeReactions?.()
  unsubscribeReactions = null
  unsubscribePhrases?.()
  unsubscribePhrases = null
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
  clearFlash()
})
</script>

<template>
  <div class="site-reactions">
    <div
      class="site-reactions__frame"
      :class="{ 'site-reactions__frame--on': flashColor }"
      :style="flashColor ? { '--reaction-flash': flashColor } : undefined"
      aria-hidden="true"
    />

    <div
      class="site-reactions__dock"
      :class="{ 'site-reactions__dock--flipping': isFlipping }"
      aria-label="Reagir ao site"
    >
      <div class="site-reactions__dock-card">
        <div v-if="!showPhrases" class="site-reactions__face">
          <button
            v-for="reaction in REACTIONS"
            :key="reaction.id"
            type="button"
            class="site-reactions__btn"
            :title="reaction.label"
            :aria-label="reaction.label"
            @click="playReaction(reaction.id, { senderName: hostName })"
          >
            <span aria-hidden="true">{{ reaction.emoji }}</span>
          </button>

          <span class="site-reactions__divider" aria-hidden="true" />

          <button
            type="button"
            class="site-reactions__btn site-reactions__btn--toggle"
            title="Frases com som"
            aria-label="Mostrar frases com som"
            @click="toggleDockMode"
          >
            <svg
              class="site-reactions__toggle-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Zm-2 14a2 2 0 1 1-2-2 2 2 0 0 1 2 2Z"
              />
            </svg>
          </button>
        </div>

        <div v-else class="site-reactions__face site-reactions__face--phrases">
          <button
            v-for="phrase in SOUND_PHRASES"
            :key="phrase.id"
            type="button"
            class="site-reactions__phrase"
            :title="phrase.label"
            :aria-label="phrase.label"
            @click="playPhrase(phrase.id, { senderName: hostName })"
          >
            {{ phrase.label }}
          </button>

          <span class="site-reactions__divider" aria-hidden="true" />

          <button
            type="button"
            class="site-reactions__btn site-reactions__btn--toggle"
            title="Emojis"
            aria-label="Mostrar emojis"
            @click="toggleDockMode"
          >
            <span class="site-reactions__toggle-emoji" aria-hidden="true">😀</span>
          </button>
        </div>
      </div>
    </div>

    <div class="site-reactions__stains" aria-hidden="true">
      <div
        v-for="stain in tomatoStains"
        :key="stain.key"
        class="tomato-stain"
        :style="{
          left: `${stain.left}%`,
          top: `${stain.top}%`,
          '--stain-size': `${stain.size}px`,
          '--stain-rotate': `${stain.rotate}deg`,
          '--stain-delay': `${stain.delay}s`,
          '--stain-drip': `${stain.drip}px`,
          '--stain-opacity': stain.opacity,
        }"
      >
        <span class="tomato-stain__blob" />
        <span class="tomato-stain__drip" />
        <span class="tomato-stain__dot tomato-stain__dot--a" />
        <span class="tomato-stain__dot tomato-stain__dot--b" />
      </div>
    </div>

    <div class="site-reactions__fingers" aria-hidden="true">
      <div
        v-for="finger in fingers"
        :key="finger.key"
        class="finger"
        :style="{
          left: `${finger.left}%`,
          top: `${finger.top}%`,
          '--finger-size': `${finger.size}px`,
          '--finger-rotate': `${finger.rotate}deg`,
          '--finger-delay': `${finger.delay}s`,
        }"
      >
        🖕
      </div>
    </div>

    <div class="site-reactions__floats" aria-hidden="true">
      <div
        v-for="item in smallFlying"
        :key="item.key"
        class="site-reactions__float"
        :style="{
          left: `${item.leftPct}%`,
          '--rise': `${item.risePct}vh`,
        }"
      >
        <span class="site-reactions__float-emoji">{{ item.emoji }}</span>
        <span v-if="item.senderName" class="site-reactions__float-sender">{{ item.senderName }}</span>
      </div>

      <div
        v-for="phrase in smallPhrases"
        :key="phrase.key"
        class="site-reactions__float"
        :style="{
          left: `${phrase.leftPct}%`,
          '--rise': `${phrase.risePct}vh`,
        }"
      >
        <span class="site-reactions__float-emoji">{{ phrase.emoji }}</span>
        <span v-if="phrase.senderName" class="site-reactions__float-sender">{{ phrase.senderName }}</span>
      </div>
    </div>

    <div class="site-reactions__stage" aria-hidden="true">
      <div
        v-for="item in bigFlying"
        :key="item.key"
        class="site-reactions__burst"
        :class="`site-reactions__burst--${item.id}`"
        :style="{ '--reaction-color': item.color }"
      >
        <span class="site-reactions__emoji">{{ item.emoji }}</span>
        <span v-if="item.senderName" class="site-reactions__burst-sender">{{ item.senderName }}</span>
        <span class="site-reactions__splash" />
      </div>

      <div
        v-for="phrase in bigPhrases"
        :key="phrase.key"
        class="site-reactions__burst site-reactions__burst--phrase"
        :style="{ '--reaction-color': '#f59e0b' }"
      >
        <span class="site-reactions__emoji">{{ phrase.emoji }}</span>
        <span v-if="phrase.senderName" class="site-reactions__burst-sender">{{ phrase.senderName }}</span>
        <span class="site-reactions__splash" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.site-reactions__frame {
  position: fixed;
  inset: 0;
  z-index: 45;
  pointer-events: none;
  border: 0 solid transparent;
  box-shadow: inset 0 0 0 0 transparent;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.site-reactions__frame--on {
  opacity: 1;
  border: 3px solid color-mix(in srgb, var(--reaction-flash) 35%, transparent);
  box-shadow:
    inset 0 0 0 2px color-mix(in srgb, var(--reaction-flash) 22%, transparent),
    inset 0 0 36px color-mix(in srgb, var(--reaction-flash) 14%, transparent),
    0 0 28px color-mix(in srgb, var(--reaction-flash) 12%, transparent);
  animation: border-fade 1.4s ease-out both;
}

.site-reactions__dock {
  --dock-pad-y: 0.45rem;
  --dock-pad-x: 0.65rem;
  position: fixed;
  left: 50%;
  bottom: 1.1rem;
  transform: translateX(-50%);
  z-index: 40;
  perspective: 900px;
  width: max-content;
  max-width: min(96vw, 820px);
}

.site-reactions__dock-card {
  width: max-content;
  max-width: min(96vw, 820px);
  transform-origin: center center;
  transform-style: preserve-3d;
  transition: transform 0.22s cubic-bezier(0.4, 0.2, 0.2, 1);
}

.site-reactions__dock--flipping {
  pointer-events: none;
}

.site-reactions__dock--flipping .site-reactions__dock-card {
  transform: rotateY(90deg);
}

.site-reactions__face {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: max-content;
  max-width: min(96vw, 820px);
  padding: var(--dock-pad-y) var(--dock-pad-x);
  border-radius: 999px;
  border: 1px solid #2f3540;
  background: rgba(20, 23, 30, 0.92);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.site-reactions__face--phrases {
  gap: 0.3rem;
  border-radius: 22px;
}

.site-reactions__frame--on ~ .site-reactions__dock .site-reactions__face {
  border-color: color-mix(in srgb, var(--reaction-flash) 28%, #2f3540);
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.35),
    0 0 0 1px color-mix(in srgb, var(--reaction-flash) 18%, transparent);
}

.site-reactions__divider {
  width: 1px;
  height: 22px;
  margin-inline: 0.15rem;
  background: rgba(255, 255, 255, 0.14);
  flex-shrink: 0;
}

.site-reactions__btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ink, #f3f4f6);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.site-reactions__btn:hover {
  transform: translateY(-2px) scale(1.08);
  background: rgba(255, 255, 255, 0.06);
}

.site-reactions__btn--toggle {
  color: rgba(243, 244, 246, 0.88);
}

.site-reactions__toggle-icon {
  display: block;
  opacity: 0.92;
}

.site-reactions__toggle-emoji {
  font-size: 1.25rem;
  line-height: 1;
}

.site-reactions__phrase {
  min-height: 42px;
  min-width: 42px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ink, #f3f4f6);
  padding: 0.55rem 0.85rem;
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.site-reactions__phrase:hover {
  transform: translateY(-2px) scale(1.04);
  background: rgba(255, 255, 255, 0.06);
}

@media (max-width: 640px) {
  .site-reactions__phrase {
    padding: 0.5rem 0.7rem;
    font-size: 0.8rem;
  }
}

.site-reactions__stains,
.site-reactions__fingers,
.site-reactions__floats {
  position: fixed;
  inset: 0;
  z-index: 48;
  pointer-events: none;
  overflow: hidden;
}

.site-reactions__float {
  position: absolute;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.2rem;
  transform: translateX(-50%);
  animation: float-up 1.2s ease-out both;
}

.site-reactions__float-emoji {
  display: block;
  font-size: clamp(1.75rem, 4.5vw, 2.5rem);
  line-height: 1;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
}

.finger {
  position: absolute;
  font-size: var(--finger-size);
  line-height: 1;
  transform: rotate(var(--finger-rotate)) scale(0.4);
  opacity: 0;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
  animation: finger-pop 1.8s ease-out both;
  animation-delay: var(--finger-delay);
}

.tomato-stain {
  position: absolute;
  width: var(--stain-size);
  height: var(--stain-size);
  transform: rotate(var(--stain-rotate));
  animation: stain-appear 2.6s ease-out both;
  animation-delay: var(--stain-delay);
}

.tomato-stain__blob {
  position: absolute;
  inset: 0;
  border-radius: 62% 38% 58% 42% / 46% 57% 43% 54%;
  background:
    radial-gradient(circle at 28% 24%, rgba(255, 170, 130, 0.55) 0%, transparent 34%),
    radial-gradient(circle at 52% 48%, rgba(220, 45, 35, 0.72) 0%, rgba(190, 20, 20, 0.42) 42%, rgba(150, 10, 10, 0.18) 68%, transparent 78%),
    radial-gradient(circle at 70% 70%, rgba(255, 80, 50, 0.35), transparent 50%);
  opacity: var(--stain-opacity);
  filter: blur(1.2px) saturate(1.2);
  box-shadow:
    inset 0 0 18px rgba(255, 90, 60, 0.28),
    0 8px 18px rgba(120, 10, 10, 0.18);
  mix-blend-mode: screen;
}

.tomato-stain__drip {
  position: absolute;
  left: 50%;
  top: 58%;
  width: calc(var(--stain-size) * 0.16);
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    rgba(220, 40, 30, 0.7) 0%,
    rgba(200, 25, 20, 0.45) 45%,
    rgba(180, 20, 15, 0.18) 78%,
    rgba(180, 20, 15, 0) 100%
  );
  transform: translateX(-50%);
  transform-origin: top center;
  filter: blur(0.8px);
  animation: stain-drip 2.6s ease-out both;
  animation-delay: var(--stain-delay);
}

.tomato-stain__drip::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: calc(var(--stain-size) * 0.2);
  height: calc(var(--stain-size) * 0.2);
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(210, 35, 25, 0.55) 0%, rgba(180, 20, 15, 0) 70%);
  filter: blur(0.6px);
}

.tomato-stain__dot {
  position: absolute;
  border-radius: 48% 52% 45% 55%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 140, 100, 0.45), transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(210, 35, 25, 0.55), rgba(170, 20, 15, 0.15) 70%, transparent 80%);
  filter: blur(0.8px);
  opacity: 0;
  animation: stain-dot 2.6s ease-out both;
  animation-delay: var(--stain-delay);
  mix-blend-mode: screen;
}

.tomato-stain__dot--a {
  width: calc(var(--stain-size) * 0.34);
  height: calc(var(--stain-size) * 0.3);
  left: -22%;
  top: 18%;
}

.tomato-stain__dot--b {
  width: calc(var(--stain-size) * 0.24);
  height: calc(var(--stain-size) * 0.22);
  right: -14%;
  bottom: 4%;
}

.site-reactions__stage {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.site-reactions__burst {
  position: absolute;
  display: grid;
  place-items: center;
  animation: hit-center 1.35s cubic-bezier(0.16, 0.84, 0.28, 1) both;
}

.site-reactions__emoji {
  font-size: clamp(4.5rem, 14vw, 7.5rem);
  line-height: 1;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35));
  z-index: 1;
}

.site-reactions__splash {
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--reaction-color) 28%, transparent) 0%,
    color-mix(in srgb, var(--reaction-color) 10%, transparent) 42%,
    transparent 70%
  );
  animation: splash 1.35s ease-out both;
}

.site-reactions__burst--tomato .site-reactions__emoji,
.site-reactions__burst--swear .site-reactions__emoji,
.site-reactions__burst--poop .site-reactions__emoji {
  animation: spin-hit 1.35s ease-out both;
}

.site-reactions__burst--heart .site-reactions__emoji,
.site-reactions__burst--clap .site-reactions__emoji,
.site-reactions__burst--laugh .site-reactions__emoji {
  animation: pulse-hit 1.35s ease-out both;
}

@keyframes float-up {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(12px) scale(0.55);
  }
  14% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.05);
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(calc(-1 * var(--rise))) scale(0.92);
  }
}

@keyframes finger-pop {
  0% {
    opacity: 0;
    transform: rotate(var(--finger-rotate)) scale(0.2) translateY(20px);
  }
  18% {
    opacity: 1;
    transform: rotate(var(--finger-rotate)) scale(1.15) translateY(0);
  }
  40% {
    opacity: 1;
    transform: rotate(var(--finger-rotate)) scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--finger-rotate)) scale(0.9) translateY(-12px);
  }
}

@keyframes stain-appear {
  0% {
    opacity: 0;
    transform: rotate(var(--stain-rotate)) scale(0.2);
  }
  12% {
    opacity: 1;
    transform: rotate(var(--stain-rotate)) scale(1.08);
  }
  30% {
    opacity: 1;
    transform: rotate(var(--stain-rotate)) scale(1);
  }
  75% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: rotate(var(--stain-rotate)) scale(1);
  }
}

@keyframes stain-drip {
  0%,
  15% {
    height: 8px;
    opacity: 0;
  }
  28% {
    opacity: 0.85;
  }
  80% {
    height: var(--stain-drip);
    opacity: 0.55;
  }
  100% {
    height: calc(var(--stain-drip) + 12px);
    opacity: 0;
  }
}

@keyframes stain-dot {
  0%,
  10% {
    opacity: 0;
    transform: scale(0.4);
  }
  25% {
    opacity: 0.8;
    transform: scale(1);
  }
  80% {
    opacity: 0.45;
  }
  100% {
    opacity: 0;
  }
}

@keyframes border-fade {
  0% {
    opacity: 0;
  }
  18% {
    opacity: 0.85;
  }
  55% {
    opacity: 0.45;
  }
  100% {
    opacity: 0;
  }
}

@keyframes hit-center {
  0% {
    opacity: 0;
    transform: translateY(28vh) scale(0.35) rotate(-18deg);
  }
  35% {
    opacity: 1;
    transform: translateY(0) scale(1.15) rotate(4deg);
  }
  70% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(-6vh) scale(0.85);
  }
}

@keyframes splash {
  0% {
    opacity: 0;
    transform: scale(0.15);
  }
  40% {
    opacity: 0.9;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.55);
  }
}

@keyframes spin-hit {
  0% {
    transform: rotate(-40deg) scale(0.7);
  }
  40% {
    transform: rotate(12deg) scale(1.2);
  }
  100% {
    transform: rotate(0deg) scale(1);
  }
}

@keyframes pulse-hit {
  0% {
    transform: scale(0.5);
  }
  40% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}

.site-reactions__float-sender {
  margin: 0;
  max-width: 70px;
  width: max-content;
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.95);
  text-align: center;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.3);
  word-wrap: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.site-reactions__burst-sender {
  position: absolute;
  bottom: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
  max-width: 70px;
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.98);
  text-align: center;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.6),
    0 4px 8px rgba(0, 0, 0, 0.4);
  word-wrap: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  z-index: 2;
}

.site-reactions__burst--phrase .site-reactions__emoji {
  animation: pulse-hit 1.35s ease-out both;
}
</style>
