import { ref } from 'vue'
import { defineStore } from 'pinia'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { MOCK_TIERLIST_SUMMARIES } from '@/data/mocks'
import type { Person, TierlistSummary, TierlistStatus } from '@/types/tierlist'

function getErrorMessage(err: unknown, fallback = 'Falha ao carregar tier lists.') {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  if (typeof err === 'string' && err.trim()) return err
  return fallback
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function computeStatus(rankedCount: number, totalFriends: number): TierlistStatus {
  if (totalFriends === 0) return 'pending'
  if (rankedCount === totalFriends) return 'completed'
  if (rankedCount === 0) return 'pending'
  return 'in_progress'
}

function getUserId(): string | null {
  const envUserId = import.meta.env.VITE_USER_ID?.trim()
  return envUserId || null
}

export const useTierlistListingStore = defineStore('tierlistListing', () => {
  const summaries = ref<TierlistSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const usingLocalMock = ref(false)

  async function fetchSummaries() {
    loading.value = true
    error.value = null
    usingLocalMock.value = false

    if (!isSupabaseConfigured()) {
      summaries.value = MOCK_TIERLIST_SUMMARIES
      usingLocalMock.value = true
      loading.value = false
      return
    }

    try {
      const userId = getUserId()
      if (!userId) {
        throw new Error('VITE_USER_ID não configurado. Configure no .env para ver seus dados.')
      }

      const { data: tierlists, error: tierlistsError } = await supabase
        .from('tierlists')
        .select('id, name, is_active, created_by, peoples:created_by(id, username, avatar_url)')
        .eq('is_active', true)

      if (tierlistsError) throw tierlistsError

      if (!tierlists || tierlists.length === 0) {
        summaries.value = MOCK_TIERLIST_SUMMARIES
        usingLocalMock.value = true
        loading.value = false
        return
      }

      const summariesPromises = tierlists.map(async (tierlist) => {
        const host = unwrapRelation(tierlist.peoples) as Person | null

        if (!host) {
          console.warn(`Tierlist ${tierlist.id} não tem host válido`)
          return null
        }

        const { count: totalFriends } = await supabase
          .from('tierlist_people_characters')
          .select('id', { count: 'exact', head: true })
          .eq('tierlist_id', tierlist.id)

        const { count: rankedCount } = await supabase
          .from('rankings')
          .select('id', { count: 'exact', head: true })
          .eq('tierlist_id', tierlist.id)
          .eq('user_id', userId)

        const total = totalFriends ?? 0
        const ranked = rankedCount ?? 0
        const pending = total - ranked

        const summary: TierlistSummary = {
          id: tierlist.id,
          name: tierlist.name,
          host,
          totalFriends: total,
          rankedCount: ranked,
          pendingCount: pending,
          status: computeStatus(ranked, total),
        }

        return summary
      })

      const results = await Promise.all(summariesPromises)
      summaries.value = results.filter((s): s is TierlistSummary => s !== null)
    } catch (err) {
      console.error('[tierlistListing] Erro ao carregar summaries:', err)
      error.value = getErrorMessage(err)
      summaries.value = MOCK_TIERLIST_SUMMARIES
      usingLocalMock.value = true
    } finally {
      loading.value = false
    }
  }

  return {
    summaries,
    loading,
    error,
    usingLocalMock,
    fetchSummaries,
  }
})
