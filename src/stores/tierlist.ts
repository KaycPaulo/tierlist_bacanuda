import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { FIXED_RANKS, type DropTarget, type RankName } from '@/constants/ranks'
import { MOCK_CHARACTERS, MOCK_LINKS, MOCK_PEOPLES, MOCK_TIERLIST_NAME } from '@/data/mocks'
import { seedMockData } from '@/lib/seed'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type {
  BoardItem,
  FixedTierRow,
  PeopleCharacterLinkRow,
  Person,
  Ranking,
  Tier,
  Tierlist,
} from '@/types/tierlist'

export type { DropTarget }

function getErrorMessage(err: unknown, fallback = 'Falha ao carregar a tierlist.') {
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

export const useTierlistStore = defineStore('tierlist', () => {
  const tierlist = ref<Tierlist | null>(null)
  const tiers = ref<FixedTierRow[]>([])
  const items = ref<BoardItem[]>([])
  const person = ref<Person | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const usingLocalMock = ref(false)

  const poolItems = computed(() => items.value.filter((item) => item.rank === null))

  function itemsInRank(rank: RankName) {
    return items.value
      .filter((item) => item.rank === rank)
      .sort((a, b) => a.characterName.localeCompare(b.characterName))
  }

  function resolveFixedTiers(dbTiers: Tier[]): FixedTierRow[] {
    return FIXED_RANKS.map((rank) => {
      const dbTier = dbTiers.find((tier) => tier.name.toUpperCase() === rank.name)
      if (!dbTier) {
        throw new Error(
          `Rank fixo "${rank.name}" não encontrado em tiers. Cadastre tiers S, A, B, C e D nesta tierlist.`,
        )
      }

      return {
        id: dbTier.id,
        name: rank.name,
        icon: rank.icon,
        color: rank.color,
        position: rank.position,
      }
    })
  }

  function loadLocalMockBoard() {
    usingLocalMock.value = true
    person.value = MOCK_PEOPLES[0] ?? null
    tierlist.value = {
      id: 0,
      name: MOCK_TIERLIST_NAME,
      is_active: true,
      created_by: MOCK_PEOPLES[0]?.id ?? null,
    }
    tiers.value = FIXED_RANKS.map((rank, index) => ({
      id: index + 1,
      name: rank.name,
      icon: rank.icon,
      color: rank.color,
      position: rank.position,
    }))
    items.value = MOCK_LINKS.map((link, index) => {
      const people = MOCK_PEOPLES.find((entry) => entry.id === link.personId)!
      const character = MOCK_CHARACTERS.find((entry) => entry.slug === link.characterSlug)!
      return {
        characterId: index + 1,
        characterName: character.name,
        imageUrl: character.image_url,
        personId: people.id,
        username: people.username,
        rank: null,
        rankingId: null,
      }
    })
  }

  async function resolvePerson(): Promise<Person | null> {
    const configuredUserId = import.meta.env.VITE_USER_ID?.trim()

    if (configuredUserId) {
      const { data, error: personError } = await supabase
        .from('peoples')
        .select('id, username, avatar_url')
        .eq('id', configuredUserId)
        .maybeSingle()

      if (personError) throw personError
      return data
    }

    const { data, error: personError } = await supabase
      .from('peoples')
      .select('id, username, avatar_url')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (personError) throw personError
    return data
  }

  async function resolveTierlist(): Promise<Tierlist | null> {
    const configuredTierlistId = import.meta.env.VITE_TIERLIST_ID?.trim()

    if (configuredTierlistId) {
      const { data, error: tierlistError } = await supabase
        .from('tierlists')
        .select('id, name, is_active, created_by')
        .eq('id', Number(configuredTierlistId))
        .maybeSingle()

      if (tierlistError) throw tierlistError
      return data
    }

    const { data, error: tierlistError } = await supabase
      .from('tierlists')
      .select('id, name, is_active, created_by')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (tierlistError) throw tierlistError
    return data
  }

  async function fetchBoard() {
    if (!isSupabaseConfigured()) {
      error.value =
        'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env e reinicie o npm run dev.'
      return
    }

    loading.value = true
    error.value = null
    usingLocalMock.value = false

    try {
      try {
        await seedMockData()
      } catch (seedError) {
        console.warn('[tierlist] seed falhou, usando mock local', seedError)
        loadLocalMockBoard()
        error.value = `Mocks locais ativos (seed no Supabase falhou: ${getErrorMessage(seedError)}). Libere INSERT/SELECT no RLS para persistir.`
        return
      }

      const currentPerson = await resolvePerson()
      if (!currentPerson) {
        loadLocalMockBoard()
        error.value =
          'Mocks locais ativos: nenhum usuário em peoples (vazio ou RLS). Libere SELECT/INSERT para anon.'
        return
      }

      const currentTierlist = await resolveTierlist()
      if (!currentTierlist) {
        loadLocalMockBoard()
        error.value =
          'Mocks locais ativos: nenhuma tierlist ativa (vazia ou RLS). Libere SELECT/INSERT para anon.'
        return
      }

      const [tiersResult, linksResult, rankingsResult] = await Promise.all([
        supabase
          .from('tiers')
          .select('id, tierlist_id, name, icon, position')
          .eq('tierlist_id', currentTierlist.id),
        supabase
          .from('tierlist_people_characters')
          .select(
            `
            id,
            user_id,
            character_id,
            peoples ( id, username, avatar_url ),
            character ( id, name, slug, image_url, is_active )
          `,
          )
          .eq('tierlist_id', currentTierlist.id),
        supabase
          .from('rankings')
          .select('id, tierlist_id, user_id, character_id, tier_id, position')
          .eq('tierlist_id', currentTierlist.id)
          .eq('user_id', currentPerson.id),
      ])

      if (tiersResult.error) throw tiersResult.error
      if (linksResult.error) throw linksResult.error
      if (rankingsResult.error) throw rankingsResult.error

      const fixedTiers = resolveFixedTiers(tiersResult.data ?? [])
      const tierIdToRank = new Map<number, RankName>(
        fixedTiers.map((tier) => [tier.id, tier.name]),
      )
      const rankingByCharacter = new Map<number, Ranking>(
        (rankingsResult.data ?? []).map((ranking) => [ranking.character_id, ranking]),
      )

      const boardItems = ((linksResult.data ?? []) as PeopleCharacterLinkRow[])
        .map((link) => {
          const people = unwrapRelation(link.peoples)
          const character = unwrapRelation(link.character)
          if (!people || !character || !character.is_active) return null

          const ranking = rankingByCharacter.get(character.id)
          return {
            characterId: character.id,
            characterName: character.name,
            imageUrl: character.image_url,
            personId: people.id,
            username: people.username,
            rank: ranking ? (tierIdToRank.get(ranking.tier_id) ?? null) : null,
            rankingId: ranking?.id ?? null,
          } satisfies BoardItem
        })
        .filter((item): item is BoardItem => item !== null)

      if (boardItems.length === 0) {
        loadLocalMockBoard()
        error.value =
          'Mocks locais ativos: sem vínculos em tierlist_people_characters (ou RLS bloqueando).'
        return
      }

      person.value = currentPerson
      tierlist.value = currentTierlist
      tiers.value = fixedTiers
      items.value = boardItems
      error.value = null
    } catch (err) {
      console.error('[tierlist] falha ao carregar', err)
      loadLocalMockBoard()
      error.value = `Mocks locais ativos. Erro Supabase: ${getErrorMessage(err)}`
    } finally {
      loading.value = false
    }
  }

  async function moveItem(characterId: number, target: DropTarget) {
    const item = items.value.find((entry) => entry.characterId === characterId)
    if (!item) return

    const previousRank = item.rank
    const previousRankingId = item.rankingId
    const nextRank = target === 'pool' ? null : target

    if (previousRank === nextRank) return

    item.rank = nextRank

    if (usingLocalMock.value || !tierlist.value || !person.value) {
      item.rankingId = null
      return
    }

    if (nextRank === null) {
      const { error: deleteError } = await supabase
        .from('rankings')
        .delete()
        .eq('tierlist_id', tierlist.value.id)
        .eq('user_id', person.value.id)
        .eq('character_id', characterId)

      if (deleteError) {
        item.rank = previousRank
        item.rankingId = previousRankingId
        error.value = deleteError.message
        return
      }

      item.rankingId = null
      return
    }

    const tier = tiers.value.find((entry) => entry.name === nextRank)
    if (!tier) {
      item.rank = previousRank
      error.value = `Rank fixo "${nextRank}" sem id no banco.`
      return
    }

    const payload = {
      tierlist_id: tierlist.value.id,
      user_id: person.value.id,
      character_id: characterId,
      tier_id: tier.id,
      position: 0,
      updated_at: new Date().toISOString(),
    }

    const { data, error: upsertError } = await supabase
      .from('rankings')
      .upsert(payload, { onConflict: 'tierlist_id,user_id,character_id' })
      .select('id')
      .single()

    if (upsertError) {
      item.rank = previousRank
      item.rankingId = previousRankingId
      error.value = upsertError.message
      return
    }

    item.rankingId = data.id
  }

  async function resetRankings() {
    items.value = items.value.map((item) => ({
      ...item,
      rank: null,
      rankingId: null,
    }))

    if (usingLocalMock.value || !tierlist.value || !person.value) return

    loading.value = true
    error.value = null

    const { error: deleteError } = await supabase
      .from('rankings')
      .delete()
      .eq('tierlist_id', tierlist.value.id)
      .eq('user_id', person.value.id)

    loading.value = false

    if (deleteError) {
      error.value = deleteError.message
    }
  }

  return {
    tierlist,
    tiers,
    items,
    person,
    loading,
    error,
    usingLocalMock,
    poolItems,
    itemsInRank,
    fetchBoard,
    moveItem,
    resetRankings,
  }
})
