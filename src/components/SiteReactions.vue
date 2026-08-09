<script lang="ts">
export default {
  name: 'SiteReactions',
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { REACTIONS, type ReactionId } from '../constants/reactions'
import { EMOTE_DURATION_MS, playReactionSound } from '../lib/reactionSounds'

interface FlyingReaction {
  key: number
  id: ReactionId
  emoji: string
  label: string
  color: string
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

let nextKey = 0
const flying = ref<FlyingReaction[]>([])
const tomatoStains = ref<TomatoStain[]>([])
const fingers = ref<FingerBurst[]>([])
const flashColor = ref<string | null>(null)
const timers = new Set<number>()
let flashTimer: number | null = null

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

function launch(reactionId: ReactionId) {
  const reaction = REACTIONS.find((entry) => entry.id === reactionId)
  if (!reaction) return

  const duration = reactionId === 'swear' ? 1800 : EMOTE_DURATION_MS

  void playReactionSound(reactionId, { durationMs: duration })
  flashBorders(reaction.color, duration)

  if (reactionId === 'tomato') {
    spawnTomatoStains()
  }

  if (reactionId === 'swear') {
    spawnFingers()
  }

  const key = ++nextKey
  flying.value.push({
    key,
    id: reaction.id,
    emoji: reaction.emoji,
    label: reaction.label,
    color: reaction.color,
  })

  const timer = window.setTimeout(() => {
    flying.value = flying.value.filter((entry) => entry.key !== key)
    timers.delete(timer)
  }, duration)

  timers.add(timer)
}

onBeforeUnmount(() => {
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

    <div class="site-reactions__dock" aria-label="Reagir ao site">
      <button
        v-for="reaction in REACTIONS"
        :key="reaction.id"
        type="button"
        class="site-reactions__btn"
        :title="reaction.label"
        :aria-label="reaction.label"
        @click="launch(reaction.id)"
      >
        <span aria-hidden="true">{{ reaction.emoji }}</span>
      </button>
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

    <div class="site-reactions__stage" aria-hidden="true">
      <div
        v-for="item in flying"
        :key="item.key"
        class="site-reactions__burst"
        :class="`site-reactions__burst--${item.id}`"
        :style="{ '--reaction-color': item.color }"
      >
        <span class="site-reactions__emoji">{{ item.emoji }}</span>
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
  position: fixed;
  left: 50%;
  bottom: 1.1rem;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.65rem;
  border-radius: 999px;
  border: 1px solid #2f3540;
  background: rgba(20, 23, 30, 0.92);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.site-reactions__frame--on ~ .site-reactions__dock {
  border-color: color-mix(in srgb, var(--reaction-flash) 28%, #2f3540);
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.35),
    0 0 0 1px color-mix(in srgb, var(--reaction-flash) 18%, transparent);
}

.site-reactions__btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.site-reactions__btn:hover {
  transform: translateY(-2px) scale(1.08);
  background: rgba(255, 255, 255, 0.06);
}

.site-reactions__stains,
.site-reactions__fingers {
  position: fixed;
  inset: 0;
  z-index: 48;
  pointer-events: none;
  overflow: hidden;
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
</style>
