import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ReactionId } from '@/constants/reactions'
import type { SoundPhraseId } from '@/constants/soundPhrases'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { playReaction, playPhrase, stopAllReactionPlays } from '@/services/reactionPlayer'

type ReactionPayload = {
  reaction_id: ReactionId
  sender_name?: string
}

type PhrasePayload = {
  phrase_id: SoundPhraseId
  sender_name?: string
}

class ReactionBroadcastService {
  private channel: RealtimeChannel | null = null
  private muted = false

  /**
   * Inicializa o serviço e se inscreve no canal de reações.
   * Deve ser chamado quando a tela de Tier List for montada.
   */
  start() {
    if (!isSupabaseConfigured()) {
      console.warn('[ReactionBroadcast] Supabase não configurado, serviço não iniciado')
      return
    }

    if (this.channel) {
      console.warn('[ReactionBroadcast] Serviço já está ativo')
      return
    }

    this.channel = supabase.channel('reactions')

    this.channel
      .on('broadcast', { event: 'send_reaction' }, ({ payload }) => {
        this.handleReactionEvent(payload as ReactionPayload)
      })
      .on('broadcast', { event: 'send_phrase' }, ({ payload }) => {
        this.handlePhraseEvent(payload as PhrasePayload)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ReactionBroadcast] Inscrito no canal de reações')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[ReactionBroadcast] Erro ao se inscrever no canal')
        } else if (status === 'TIMED_OUT') {
          console.error('[ReactionBroadcast] Timeout ao se inscrever no canal')
        }
      })
  }

  /**
   * Para o serviço e cancela a inscrição no canal.
   * Deve ser chamado quando a tela de Tier List for desmontada.
   */
  stop() {
    if (!this.channel) {
      return
    }

    supabase.removeChannel(this.channel)
    this.channel = null
    this.muted = false
    console.log('[ReactionBroadcast] Desconectado do canal de reações')
  }

  /**
   * Silencia ou reativa a escuta de reações/frases remotas.
   * O host continua tocando localmente pelo dock.
   * Ao silenciar, corta áudio e floods em andamento na hora.
   */
  setMuted(muted: boolean) {
    this.muted = muted
    if (muted) {
      stopAllReactionPlays()
    }
    console.log(`[ReactionBroadcast] Escuta ${muted ? 'silenciada' : 'reativada'}`)
  }

  /** Alterna o mute e retorna o novo estado. */
  toggleMuted(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  /**
   * Retorna se o serviço está silenciado.
   */
  isMuted(): boolean {
    return this.muted
  }

  /**
   * Retorna se o serviço está ativo.
   */
  isActive(): boolean {
    return this.channel !== null
  }

  private handleReactionEvent(payload: ReactionPayload) {
    if (this.muted) {
      console.log('[ReactionBroadcast] Reação ignorada (silenciado):', payload.reaction_id)
      return
    }

    const reactionId = payload.reaction_id
    const senderName = payload.sender_name

    console.log(
      '[ReactionBroadcast] Tocando reação:',
      reactionId,
      senderName ? `de ${senderName}` : '',
    )

    playReaction(reactionId, { senderName })
  }

  private handlePhraseEvent(payload: PhrasePayload) {
    if (this.muted) {
      console.log('[ReactionBroadcast] Frase ignorada (silenciada):', payload.phrase_id)
      return
    }

    const phraseId = payload.phrase_id
    const senderName = payload.sender_name

    console.log(
      '[ReactionBroadcast] Tocando frase:',
      phraseId,
      senderName ? `de ${senderName}` : '',
    )

    playPhrase(phraseId, { senderName })
  }
}

// Exporta instância única (singleton)
export const reactionBroadcastService = new ReactionBroadcastService()
