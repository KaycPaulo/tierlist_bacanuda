import { getReaction, type ReactionId } from '@/constants/reactions'
import { getSoundPhrase, type SoundPhraseId } from '@/constants/soundPhrases'
import {
  EMOTE_DURATION_MS,
  playPhraseSound,
  playReactionSound,
  stopAllReactionSounds,
} from '@/lib/reactionSounds'

const SPAM_WINDOW_MS = 4000
const SPAM_THRESHOLD = 10
const SMALL_DURATION_MS = 1200

/** Reações que só tocam som no modo grande. Clique único ainda anima (sobe). */
const SOUND_ONLY_ON_BIG = new Set<ReactionId>(['tomato', 'poop', 'clap', 'heart', 'laugh', 'swear'])

export type ReactionVisualMode = 'small' | 'big'

export interface ReactionPlayEvent {
  id: ReactionId
  mode: ReactionVisualMode
  emoji: string
  label: string
  color: string
  /** Posição horizontal aleatória (0–100), modo small. */
  leftPct: number
  /** Altura de subida em % da viewport (20–50), modo small. */
  risePct: number
  durationMs: number
  senderName?: string
}

export interface PhrasePlayEvent {
  id: SoundPhraseId
  mode: ReactionVisualMode
  emoji: string
  label: string
  /** Posição horizontal aleatória (0–100), modo small. */
  leftPct: number
  /** Altura de subida em % da viewport (20–50), modo small. */
  risePct: number
  durationMs: number
  senderName?: string
}

type ReactionListener = (event: ReactionPlayEvent) => void
type PhraseListener = (event: PhrasePlayEvent) => void
type StopListener = () => void

const reactionListeners = new Set<ReactionListener>()
const phraseListeners = new Set<PhraseListener>()
const stopListeners = new Set<StopListener>()
const recentTriggers = new Map<ReactionId | SoundPhraseId, number[]>()

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function recordAndIsBig(id: ReactionId | SoundPhraseId): boolean {
  const now = Date.now()
  const recent = (recentTriggers.get(id) ?? []).filter((t) => now - t < SPAM_WINDOW_MS)
  recent.push(now)

  const isBig = recent.length >= SPAM_THRESHOLD
  recentTriggers.set(id, isBig ? [] : recent)
  return isBig
}

/** Inscreve um listener visual de reações (ex.: SiteReactions). Retorna unsubscribe. */
export function subscribeReactionPlays(listener: ReactionListener): () => void {
  reactionListeners.add(listener)
  return () => {
    reactionListeners.delete(listener)
  }
}

/** Inscreve um listener visual de frases (ex.: SiteReactions). Retorna unsubscribe. */
export function subscribePhrasePlays(listener: PhraseListener): () => void {
  phraseListeners.add(listener)
  return () => {
    phraseListeners.delete(listener)
  }
}

/** Inscreve limpeza imediata de floods/visuais ao silenciar. */
export function subscribeReactionStop(listener: StopListener): () => void {
  stopListeners.add(listener)
  return () => {
    stopListeners.delete(listener)
  }
}

/** Para áudio e avisa a UI para limpar floods em andamento. */
export function stopAllReactionPlays() {
  stopAllReactionSounds()
  recentTriggers.clear()
  stopListeners.forEach((listener) => listener())
}

/**
 * Dispara uma reação (som + evento visual).
 * Independente do modo do dock — pode ser chamado de realtime, etc.
 */
export function playReaction(id: ReactionId, options?: { senderName?: string }): void {
  const reaction = getReaction(id)
  if (!reaction) return

  const mode: ReactionVisualMode = recordAndIsBig(id) ? 'big' : 'small'
  const durationMs =
    mode === 'big' ? (id === 'swear' ? 1800 : EMOTE_DURATION_MS) : SMALL_DURATION_MS

  // Áudios mapeados só na reação grande; clique único só anima (sobe).
  if (!(mode === 'small' && SOUND_ONLY_ON_BIG.has(id))) {
    void playReactionSound(id, {
      durationMs,
      playFull: mode === 'big' && SOUND_ONLY_ON_BIG.has(id),
    })
  }

  const event: ReactionPlayEvent = {
    id,
    mode,
    emoji: reaction.emoji,
    label: reaction.label,
    color: reaction.color,
    leftPct: randomBetween(8, 92),
    risePct: randomBetween(20, 50),
    durationMs,
    senderName: options?.senderName,
  }

  reactionListeners.forEach((listener) => listener(event))
}

/**
 * Toca uma frase com som + evento visual.
 * Independente do modo do dock — no máximo 1 frase por vez.
 */
export function playPhrase(id: SoundPhraseId, options?: { senderName?: string }): void {
  const phrase = getSoundPhrase(id)
  if (!phrase) return

  void playPhraseSound(phrase.src)

  const mode: ReactionVisualMode = recordAndIsBig(id) ? 'big' : 'small'
  const durationMs = mode === 'big' ? EMOTE_DURATION_MS : SMALL_DURATION_MS

  const event: PhrasePlayEvent = {
    id,
    mode,
    emoji: '📢',
    label: phrase.label,
    leftPct: randomBetween(8, 92),
    risePct: randomBetween(20, 50),
    durationMs,
    senderName: options?.senderName,
  }

  phraseListeners.forEach((listener) => listener(event))
}
