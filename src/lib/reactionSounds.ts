import type { ReactionId } from '@/constants/reactions'

let audioCtx: AudioContext | null = null

function getContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  return audioCtx
}

function tone(
  ctx: AudioContext,
  {
    frequency,
    duration,
    type = 'sine',
    start = 0,
    gain = 0.12,
    endFrequency,
  }: {
    frequency: number
    duration: number
    type?: OscillatorType
    start?: number
    gain?: number
    endFrequency?: number
  },
) {
  const now = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, now)
  if (endFrequency != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), now + duration)
  }

  amp.gain.setValueAtTime(0.0001, now)
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.015)
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

function noiseBurst(
  ctx: AudioContext,
  {
    duration = 0.18,
    gain = 0.08,
    frequency = 900,
    type = 'lowpass',
    start = 0,
  }: {
    duration?: number
    gain?: number
    frequency?: number
    type?: BiquadFilterType
    start?: number
  } = {},
) {
  const sampleCount = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < sampleCount; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount)
  }

  const source = ctx.createBufferSource()
  const amp = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  const now = ctx.currentTime + start

  source.buffer = buffer
  filter.type = type
  filter.frequency.value = frequency
  amp.gain.setValueAtTime(gain, now)
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  source.connect(filter)
  filter.connect(amp)
  amp.connect(ctx.destination)
  source.start(now)
}

/** Bipes de censura de TV/rádio em cima de palavrões. */
function censorshipBleeps(ctx: AudioContext, offset = 0) {
  const pattern = [
    { start: 0, duration: 0.1 },
    { start: 0.13, duration: 0.09 },
    { start: 0.26, duration: 0.18 },
  ]

  for (const beep of pattern) {
    tone(ctx, {
      frequency: 1000,
      duration: beep.duration,
      type: 'sine',
      start: offset + beep.start,
      gain: 0.14,
    })
    tone(ctx, {
      frequency: 2000,
      duration: beep.duration,
      type: 'sine',
      start: offset + beep.start,
      gain: 0.035,
    })
  }
}

/** Soco / impacto de briga. */
function fightHit(ctx: AudioContext, start = 0, gain = 0.14) {
  noiseBurst(ctx, {
    duration: 0.08,
    gain,
    frequency: 900,
    type: 'lowpass',
    start,
  })
  tone(ctx, {
    frequency: 140,
    endFrequency: 50,
    duration: 0.12,
    type: 'triangle',
    start,
    gain: gain * 0.9,
  })
}

/** Tiro curto. */
function gunshot(ctx: AudioContext, start = 0) {
  noiseBurst(ctx, {
    duration: 0.09,
    gain: 0.2,
    frequency: 3500,
    type: 'highpass',
    start,
  })
  noiseBurst(ctx, {
    duration: 0.16,
    gain: 0.12,
    frequency: 500,
    type: 'lowpass',
    start: start + 0.01,
  })
  tone(ctx, {
    frequency: 180,
    endFrequency: 40,
    duration: 0.18,
    type: 'sawtooth',
    start,
    gain: 0.12,
  })
}

function fightScene(ctx: AudioContext) {
  // Briga: socos em sequência
  fightHit(ctx, 0, 0.15)
  fightHit(ctx, 0.16, 0.12)
  fightHit(ctx, 0.3, 0.16)
  fightHit(ctx, 0.48, 0.11)
  fightHit(ctx, 0.62, 0.14)

  // Xingamento bipado no meio da briga
  censorshipBleeps(ctx, 0.2)
  censorshipBleeps(ctx, 0.72)

  // Tiros
  gunshot(ctx, 0.55)
  gunshot(ctx, 0.88)
  gunshot(ctx, 1.15)
}

const PLAYERS: Record<ReactionId, (ctx: AudioContext) => void> = {
  tomato: (ctx) => {
    // Whoosh + splat
    noiseBurst(ctx, { duration: 0.12, gain: 0.06, frequency: 1800, type: 'highpass' })
    noiseBurst(ctx, { duration: 0.2, gain: 0.12, frequency: 700, start: 0.08 })
    tone(ctx, {
      frequency: 240,
      endFrequency: 55,
      duration: 0.26,
      type: 'triangle',
      start: 0.08,
      gain: 0.16,
    })
  },
  laugh: (ctx) => {
    // Risadinha em staccato
    const notes = [520, 640, 580, 720, 680, 780]
    notes.forEach((frequency, index) => {
      tone(ctx, {
        frequency,
        duration: 0.07,
        type: 'square',
        start: index * 0.08,
        gain: 0.055,
      })
    })
  },
  swear: (ctx) => {
    fightScene(ctx)
  },
  heart: (ctx) => {
    // Dois batimentos suaves
    tone(ctx, { frequency: 523.25, duration: 0.14, type: 'sine', gain: 0.09 })
    tone(ctx, { frequency: 659.25, duration: 0.2, type: 'sine', start: 0.12, gain: 0.08 })
    tone(ctx, { frequency: 783.99, duration: 0.24, type: 'sine', start: 0.26, gain: 0.05 })
  },
  clap: (ctx) => {
    // Duas palmas secas
    noiseBurst(ctx, { duration: 0.07, gain: 0.16, frequency: 2200, type: 'bandpass' })
    noiseBurst(ctx, {
      duration: 0.07,
      gain: 0.14,
      frequency: 2400,
      type: 'bandpass',
      start: 0.12,
    })
  },
  poop: (ctx) => {
    // Fallback se o MP3 não tocar
    tone(ctx, {
      frequency: 95,
      endFrequency: 42,
      duration: 0.42,
      type: 'sawtooth',
      gain: 0.11,
    })
    tone(ctx, {
      frequency: 70,
      endFrequency: 35,
      duration: 0.48,
      type: 'triangle',
      start: 0.04,
      gain: 0.09,
    })
    noiseBurst(ctx, { duration: 0.28, gain: 0.05, frequency: 280, start: 0.08 })
  },
}

const AUDIO_FILES: Partial<
  Record<
    ReactionId,
    {
      src: string
      /** < 1 = mais lento e mais grave */
      playbackRate?: number
      volume?: number
    }
  >
> = {
  poop: {
    src: '/sounds/poop.mp3',
    playbackRate: 0.62,
    volume: 0.95,
  },
}

const bufferCache = new Map<string, AudioBuffer>()
let preloadPromise: Promise<void> | null = null

/** Duração padrão do emote na tela (ms). */
export const EMOTE_DURATION_MS = 1400

async function loadBuffer(src: string) {
  const cached = bufferCache.get(src)
  if (cached) return cached

  const ctx = getContext()
  if (!ctx) throw new Error('AudioContext indisponível')

  const response = await fetch(src)
  const data = await response.arrayBuffer()
  const buffer = await ctx.decodeAudioData(data.slice(0))
  bufferCache.set(src, buffer)
  return buffer
}

/** Pré-carrega MP3s das reações para tocar sem atraso. */
export function preloadReactionSounds() {
  if (preloadPromise) return preloadPromise

  preloadPromise = (async () => {
    getContext()
    await Promise.all(
      Object.values(AUDIO_FILES).map(async (file) => {
        if (!file) return
        try {
          await loadBuffer(file.src)
        } catch (error) {
          console.warn('[reactionSounds] falha ao pré-carregar', file.src, error)
        }
      }),
    )
  })()

  return preloadPromise
}

function playBufferedForEmote(
  buffer: AudioBuffer,
  durationMs: number,
  options?: { playbackRate?: number; volume?: number },
) {
  const ctx = getContext()
  if (!ctx) return

  const playbackRate = options?.playbackRate ?? 1
  const volume = options?.volume ?? 0.9
  const fadeMs = 180
  const playSeconds = durationMs / 1000
  const fadeSeconds = fadeMs / 1000

  const source = ctx.createBufferSource()
  const amp = ctx.createGain()
  const now = ctx.currentTime

  source.buffer = buffer
  source.playbackRate.value = playbackRate

  amp.gain.setValueAtTime(volume, now)
  amp.gain.setValueAtTime(volume, now + Math.max(0.01, playSeconds - fadeSeconds))
  amp.gain.linearRampToValueAtTime(0.0001, now + playSeconds)

  source.connect(amp)
  amp.connect(ctx.destination)
  source.start(now)
  source.stop(now + playSeconds + 0.02)

  return () => {
    try {
      source.stop()
    } catch {
      // já parado
    }
  }
}

export async function playReactionSound(
  reactionId: ReactionId,
  options?: { durationMs?: number },
) {
  const durationMs = options?.durationMs ?? EMOTE_DURATION_MS
  const file = AUDIO_FILES[reactionId]
  const ctx = getContext()

  if (ctx?.state === 'suspended') {
    await ctx.resume()
  }

  if (file) {
    try {
      // Garante buffer pronto; na 1ª vez pode carregar, depois é instantâneo
      await preloadReactionSounds()
      const buffer = await loadBuffer(file.src)
      return playBufferedForEmote(buffer, durationMs, {
        playbackRate: file.playbackRate,
        volume: file.volume,
      })
    } catch (error) {
      console.warn('[reactionSounds] falha ao tocar MP3, usando fallback', error)
    }
  }

  if (!ctx) return
  PLAYERS[reactionId]?.(ctx)
}
