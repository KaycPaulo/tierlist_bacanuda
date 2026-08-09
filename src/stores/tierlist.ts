import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { FIXED_RANKS, type DropTarget, type RankName } from '@/constants/ranks'
import { MOCK_CHARACTERS, MOCK_LINKS, MOCK_PEOPLES, MOCK_TIERLIST_NAME } from '@/data/mocks'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { BoardItem, Character, FixedTierRow, Person, Tierlist } from '@/types/tierlist'

export type { DropTarget }

const EXCLUDED_PEOPLE_KEY = 'tierlist:excluded-people'

function loadExcludedPersonIds(): string[] {
  try {
    const raw = localStorage.getItem(EXCLUDED_PEOPLE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : []
  } catch {
    return []
  }
}

function saveExcludedPersonIds(ids: string[]) {
  localStorage.setItem(EXCLUDED_PEOPLE_KEY, JSON.stringify(ids))
}

function isRankName(value: string): value is RankName {
  return FIXED_RANKS.some((rank) => rank.name === value)
}

function buildFixedTiers(): FixedTierRow[] {
  return FIXED_RANKS.map((rank, index) => ({
    id: index + 1,
    name: rank.name,
    label: rank.label,
    icon: rank.icon,
    color: rank.color,
    position: rank.position,
  }))
}

export const useTierlistStore = defineStore('tierlist', () => {
  const tierlist = ref<Tierlist | null>(null)
  const tiers = ref<FixedTierRow[]>([])
  const items = ref<BoardItem[]>([])
  const peoples = ref<Person[]>([])
  const characters = ref<Character[]>([])
  const person = ref<Person | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const usingLocalMock = ref(false)
  const excludedPersonIds = ref<string[]>(loadExcludedPersonIds())

  function isPersonExcluded(personId: string) {
    return excludedPersonIds.value.includes(personId)
  }

  function togglePersonExcluded(personId: string) {
    const next = new Set(excludedPersonIds.value)
    if (next.has(personId)) next.delete(personId)
    else next.add(personId)
    excludedPersonIds.value = [...next]
    saveExcludedPersonIds(excludedPersonIds.value)
    void fetchBoard()
  }

  const poolItems = computed(() =>
    items.value
      .filter((item) => item.rank === null)
      .sort((a, b) => a.order - b.order),
  )
  const currentItem = computed(() => poolItems.value[0] ?? null)

  function itemsInRank(rank: RankName) {
    return items.value
      .filter((item) => item.rank === rank)
      .sort((a, b) => a.order - b.order)
  }

  function loadLocalMockBoard(reason?: string) {
    usingLocalMock.value = true
    error.value = reason ?? null
    person.value = MOCK_PEOPLES[0] ?? null
    peoples.value = MOCK_PEOPLES
    characters.value = MOCK_CHARACTERS.map((entry, index) => ({
      id: index + 1,
      name: entry.name,
      slug: entry.slug,
      image_url: entry.image_url,
      is_active: true,
    }))
    tierlist.value = {
      id: 0,
      name: MOCK_TIERLIST_NAME,
      is_active: true,
      created_by: MOCK_PEOPLES[0]?.id ?? null,
    }
    tiers.value = buildFixedTiers()
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
        order: index,
        rankingId: null,
      }
    }).filter((item) => !isPersonExcluded(item.personId))
  }

  async function fetchBoard() {
    loading.value = true
    error.value = null

    if (!isSupabaseConfigured()) {
      loadLocalMockBoard('Supabase não configurado — usando mock local.')
      loading.value = false
      return
    }

    try {
      const [peoplesRes, charactersRes, linksRes] = await Promise.all([
        supabase.from('peoples').select('id, username, avatar_url').order('created_at', {
          ascending: true,
        }),
        supabase
          .from('character')
          .select('id, name, slug, image_url, is_active')
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
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
          .order('created_at', { ascending: true }),
      ])

      if (peoplesRes.error) throw new Error(peoplesRes.error.message)
      if (charactersRes.error) throw new Error(charactersRes.error.message)

      const fetchedPeoples = (peoplesRes.data ?? []) as Person[]
      const fetchedCharacters = (charactersRes.data ?? []) as Character[]

      peoples.value = fetchedPeoples
      characters.value = fetchedCharacters
      person.value = fetchedPeoples[0] ?? null
      tiers.value = buildFixedTiers()
      tierlist.value = {
        id: 0,
        name: 'Tierlist',
        is_active: true,
        created_by: fetchedPeoples[0]?.id ?? null,
      }
      usingLocalMock.value = false

      const visiblePeoples = fetchedPeoples.filter((entry) => !isPersonExcluded(entry.id))

      // Só usa vínculo explícito pessoa ↔ personagem (nunca empilha por ordem)
      if (linksRes.error) {
        throw new Error(
          `${linksRes.error.message}. Rode supabase/rls-cadastro.sql para liberar os vínculos.`,
        )
      }

      const linkedItems: BoardItem[] = []
      for (const row of linksRes.data ?? []) {
        const people = Array.isArray(row.peoples) ? row.peoples[0] : row.peoples
        const character = Array.isArray(row.character) ? row.character[0] : row.character
        if (!people || !character) continue
        if (isPersonExcluded(people.id)) continue
        linkedItems.push({
          characterId: character.id,
          characterName: character.name,
          imageUrl: character.image_url,
          personId: people.id,
          username: people.username,
          rank: null,
          order: linkedItems.length,
          rankingId: null,
        })
      }
      items.value = linkedItems

      if (items.value.length === 0) {
        error.value =
          fetchedPeoples.length === 0 && fetchedCharacters.length === 0
            ? 'Nenhuma pessoa ou personagem no Supabase. Cadastre na tela de cadastro.'
            : visiblePeoples.length === 0
              ? 'Todas as pessoas estão ocultas. Reative alguém no cadastro.'
              : (linksRes.data?.length ?? 0) === 0
                ? 'Nenhum vínculo pessoa ↔ personagem. No cadastro, escolha o personagem de cada pessoa.'
                : 'Nenhum personagem visível na tierlist.'
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
   * `beforeCharacterId`: inserir antes desse item (reordenar).
   * No pool sem referência: volta para o início da fila (Hora de Ranquear).
   */
  function moveItem(
    characterId: number,
    target: DropTarget,
    beforeCharacterId: number | null = null,
  ) {
    const item = items.value.find((entry) => entry.characterId === characterId)
    if (!item) return
    if (beforeCharacterId === characterId) return

    const nextRank = target === 'pool' ? null : target
    if (nextRank !== null && !isRankName(nextRank)) return

    const siblings = items.value
      .filter((entry) => entry.rank === nextRank && entry.characterId !== characterId)
      .sort((a, b) => a.order - b.order)

    let insertAt = siblings.length

    if (beforeCharacterId != null) {
      const beforeIndex = siblings.findIndex((entry) => entry.characterId === beforeCharacterId)
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
      const currentIndex = currentList.findIndex((entry) => entry.characterId === characterId)
      if (currentIndex === insertAt) return
    }

    item.rank = nextRank
    siblings.splice(insertAt, 0, item)
    siblings.forEach((entry, index) => {
      entry.order = index
    })
  }

  async function resetRankings() {
    items.value = [...items.value]
      .sort((a, b) => a.characterId - b.characterId)
      .map((item, index) => ({
        ...item,
        rank: null,
        order: index,
        rankingId: null,
      }))
  }

  return {
    tierlist,
    tiers,
    items,
    peoples,
    characters,
    person,
    loading,
    error,
    usingLocalMock,
    excludedPersonIds,
    poolItems,
    currentItem,
    itemsInRank,
    isPersonExcluded,
    togglePersonExcluded,
    fetchBoard,
    moveItem,
    resetRankings,
  }
})
