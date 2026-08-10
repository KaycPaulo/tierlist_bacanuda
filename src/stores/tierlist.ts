import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { DropTarget } from '@/constants/ranks'
import { MOCK_CHARACTERS, MOCK_LINKS, MOCK_PEOPLES, MOCK_TIERLIST_NAME } from '@/data/mocks'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { saveTierlistRankings } from '@/lib/tierlistCrud'
import type { BoardItem, BoardTier, Person, Ranking, Tierlist } from '@/types/tierlist'

export type { DropTarget }

function isUnranked(tierId: number | null, position: number | null) {
  return tierId == null && position == null
}

export const useTierlistStore = defineStore('tierlist', () => {
  const tierlist = ref<Tierlist | null>(null)
  const author = ref<Person | null>(null)
  const tiers = ref<BoardTier[]>([])
  const items = ref<BoardItem[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const usingLocalMock = ref(false)
  const dirty = ref(false)

  const poolItems = computed(() =>
    items.value
      .filter((item) => item.rank === null)
      .sort((a, b) => a.order - b.order),
  )
  const currentItem = computed(() => poolItems.value[0] ?? null)

  const authorLabel = computed(() => {
    if (!author.value) return null
    return author.value.hostname?.trim() || author.value.username
  })

  function itemsInRank(rank: string) {
    return items.value
      .filter((item) => item.rank === rank)
      .sort((a, b) => a.order - b.order)
  }

  function findTierById(tierId: number | null) {
    if (tierId == null) return null
    return tiers.value.find((tier) => tier.id === tierId) ?? null
  }

  function markDirty() {
    dirty.value = true
  }

  function loadLocalMockBoard(reason?: string) {
    usingLocalMock.value = true
    error.value = reason ?? null
    dirty.value = false
    author.value = MOCK_PEOPLES[0] ?? null
    tierlist.value = {
      id: 0,
      name: MOCK_TIERLIST_NAME,
      is_active: true,
      created_by: MOCK_PEOPLES[0]?.id ?? null,
    }

    items.value = MOCK_LINKS.map((link, index) => {
      const people = MOCK_PEOPLES.find((entry) => entry.id === link.personId)!
      const character = MOCK_CHARACTERS.find((entry) => entry.slug === link.characterSlug)!
      return {
        rankingId: index + 1,
        personId: people.id,
        username: people.username,
        imageUrl: character.image_url,
        rank: null,
        tierId: null,
        order: index,
      }
    })
  }

  async function fetchBoard(tierlistId?: number) {
    loading.value = true
    error.value = null
    dirty.value = false

    if (isSupabaseConfigured()) {
      try {
        const tiersRes = await supabase
          .from('tiers')
          .select('id, name, icon, color, position')
          .order('position', { ascending: true })

        if (tiersRes.error) {
          console.error('[fetchBoard] Erro ao buscar tiers:', tiersRes.error.message)
        } else {
          tiers.value = (tiersRes.data ?? []) as BoardTier[]
        }
      } catch (err) {
        console.error('[fetchBoard] Exceção ao buscar tiers:', err)
      }
    }

    if (!isSupabaseConfigured()) {
      loadLocalMockBoard('Supabase não configurado — usando mock local.')
      loading.value = false
      return
    }

    if (!tierlistId) {
      loadLocalMockBoard('Tier list inválida — usando mock local.')
      loading.value = false
      return
    }

    try {
      const { data: tierlistData, error: tierlistError } = await supabase
        .from('tierlists')
        .select(
          'id, name, is_active, created_by, peoples:created_by(id, username, hostname, avatar_url)',
        )
        .eq('id', tierlistId)
        .maybeSingle()

      if (tierlistError) throw new Error(tierlistError.message)
      if (!tierlistData) throw new Error('Tier list não encontrada.')

      const host = Array.isArray(tierlistData.peoples)
        ? tierlistData.peoples[0]
        : tierlistData.peoples

      tierlist.value = {
        id: tierlistData.id,
        name: tierlistData.name,
        is_active: tierlistData.is_active,
        created_by: tierlistData.created_by,
      }
      author.value = (host as Person | null) ?? null
      usingLocalMock.value = false

      const { data: rankingRows, error: rankingsError } = await supabase
        .from('rankings')
        .select('id, tierlist_id, friend_id, tier_id, position')
        .eq('tierlist_id', tierlistId)

      if (rankingsError) throw new Error(rankingsError.message)

      const rankings = (rankingRows ?? []) as Ranking[]
      const friendIds = rankings.map((row) => row.friend_id).filter(Boolean)

      let friendsById = new Map<string, Person>()
      if (friendIds.length > 0) {
        const { data: peopleRows, error: peopleError } = await supabase
          .from('peoples')
          .select('id, username, hostname, avatar_url')
          .in('id', friendIds)

        if (peopleError) throw new Error(peopleError.message)
        friendsById = new Map(
          ((peopleRows ?? []) as Person[]).map((person) => [person.id, person]),
        )
      }

      const ranked: BoardItem[] = []
      const unranked: BoardItem[] = []

      for (const ranking of rankings) {
        const friend = friendsById.get(ranking.friend_id)
        if (!friend) continue

        const tier = findTierById(ranking.tier_id)
        const item: BoardItem = {
          rankingId: ranking.id,
          personId: friend.id,
          username: friend.username,
          imageUrl: friend.avatar_url,
          rank: null,
          tierId: null,
          order: 0,
        }

        if (isUnranked(ranking.tier_id, ranking.position) || !tier) {
          unranked.push(item)
          continue
        }

        item.rank = tier.name
        item.tierId = tier.id
        item.order = ranking.position ?? ranked.length
        ranked.push(item)
      }

      // Reordena por tier e position salvos
      const byTier = new Map<string, BoardItem[]>()
      for (const item of ranked) {
        if (!item.rank) continue
        const list = byTier.get(item.rank) ?? []
        list.push(item)
        byTier.set(item.rank, list)
      }

      const normalized: BoardItem[] = []
      for (const tier of tiers.value) {
        const list = (byTier.get(tier.name) ?? []).sort((a, b) => a.order - b.order)
        list.forEach((item, index) => {
          item.order = index
          normalized.push(item)
        })
      }

      unranked.forEach((item, index) => {
        item.rank = null
        item.tierId = null
        item.order = index
        normalized.push(item)
      })

      items.value = normalized

      if (items.value.length === 0) {
        error.value = 'Nenhum amigo nesta tier list. Edite a tier list e adicione amigos.'
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar do Supabase.'
      loadLocalMockBoard(`${message} — usando mock local.`)
    } finally {
      loading.value = false
    }
  }

  /**
   * Move para uma tier ou de volta ao pool.
   * `beforePersonId`: inserir antes desse item (reordenar).
   * No pool sem referência: volta para o início da fila (Hora de Ranquear).
   */
  function moveItem(
    personId: string,
    target: DropTarget,
    beforePersonId: string | null = null,
  ) {
    const item = items.value.find((entry) => entry.personId === personId)
    if (!item) return
    if (beforePersonId === personId) return

    const nextRank = target === 'pool' ? null : target
    const nextTier = nextRank ? tiers.value.find((tier) => tier.name === nextRank) : null

    if (nextRank !== null && !nextTier) return

    const siblings = items.value
      .filter((entry) => entry.rank === nextRank && entry.personId !== personId)
      .sort((a, b) => a.order - b.order)

    let insertAt = siblings.length

    if (beforePersonId != null) {
      const beforeIndex = siblings.findIndex((entry) => entry.personId === beforePersonId)
      if (beforeIndex >= 0) insertAt = beforeIndex
    } else if (nextRank === null) {
      insertAt = 0
    }

    if (item.rank === nextRank) {
      const currentList =
        nextRank === null
          ? items.value
              .filter((entry) => entry.rank === null)
              .sort((a, b) => a.order - b.order)
          : itemsInRank(nextRank)
      const currentIndex = currentList.findIndex((entry) => entry.personId === personId)
      if (currentIndex === insertAt) return
    }

    item.rank = nextRank
    item.tierId = nextTier?.id ?? null
    siblings.splice(insertAt, 0, item)
    siblings.forEach((entry, index) => {
      entry.order = index
    })
    markDirty()
  }

  function resetRankings() {
    items.value = [...items.value]
      .sort((a, b) => a.rankingId - b.rankingId)
      .map((item, index) => ({
        ...item,
        rank: null,
        tierId: null,
        order: index,
      }))
    markDirty()
  }

  async function saveBoard() {
    if (!tierlist.value || usingLocalMock.value) {
      dirty.value = false
      return
    }

    saving.value = true
    error.value = null

    try {
      const payload = items.value.map((item) => ({
        rankingId: item.rankingId,
        tierId: item.tierId,
        position: item.rank == null ? null : item.order,
      }))

      await saveTierlistRankings(tierlist.value.id, payload)
      dirty.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Falha ao salvar a tier list.'
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    tierlist,
    author,
    authorLabel,
    tiers,
    items,
    loading,
    saving,
    error,
    usingLocalMock,
    dirty,
    poolItems,
    currentItem,
    itemsInRank,
    fetchBoard,
    moveItem,
    resetRankings,
    saveBoard,
  }
})
