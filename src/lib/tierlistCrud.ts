import { isSupabaseConfigured, supabase } from './supabase'
import type { Person, Ranking, Tierlist } from '@/types/tierlist'

export interface TierlistForEdit {
  tierlist: Tierlist
  host: Person | null
  friends: Person[]
  rankingFriendIds: string[]
}

function assertConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function getTierlistForEdit(tierlistId: number): Promise<TierlistForEdit> {
  assertConfigured()

  const { data: tierlistRow, error: tierlistError } = await supabase
    .from('tierlists')
    .select('id, name, is_active, created_by, peoples:created_by(id, username, hostname, avatar_url)')
    .eq('id', tierlistId)
    .maybeSingle()

  if (tierlistError) throw new Error(tierlistError.message)
  if (!tierlistRow) throw new Error('Tier list não encontrada')

  const { data: rankingRows, error: rankingsError } = await supabase
    .from('rankings')
    .select('id, tierlist_id, friend_id, tier_id, position')
    .eq('tierlist_id', tierlistId)

  if (rankingsError) throw new Error(rankingsError.message)

  const rankingFriendIds = (rankingRows ?? [])
    .map((row) => row.friend_id as string)
    .filter(Boolean)

  let friends: Person[] = []
  if (rankingFriendIds.length > 0) {
    const { data: peopleRows, error: peopleError } = await supabase
      .from('peoples')
      .select('id, username, hostname, avatar_url')
      .in('id', rankingFriendIds)
      .order('username', { ascending: true })

    if (peopleError) throw new Error(peopleError.message)
    friends = (peopleRows ?? []) as Person[]
  }

  const host = unwrapRelation(tierlistRow.peoples) as Person | null

  return {
    tierlist: {
      id: tierlistRow.id,
      name: tierlistRow.name,
      is_active: tierlistRow.is_active,
      created_by: tierlistRow.created_by,
    },
    host,
    friends,
    rankingFriendIds,
  }
}

export async function createTierlist(input: {
  name: string
  hostId: string
  friendIds: string[]
}): Promise<{ tierlist: Tierlist; rankings: Ranking[] }> {
  assertConfigured()

  const name = input.name.trim()
  if (!name) throw new Error('Informe o nome da tier list.')
  if (!input.hostId) throw new Error('Selecione o host da tier list.')

  const friendIds = [...new Set(input.friendIds)].filter((id) => id && id !== input.hostId)
  if (friendIds.length === 0) {
    throw new Error('Selecione pelo menos um amigo para tierlistar.')
  }

  const { data: created, error: createError } = await supabase
    .from('tierlists')
    .insert({
      name,
      is_active: true,
      created_by: input.hostId,
    })
    .select('id, name, is_active, created_by')
    .single()

  if (createError) throw new Error(createError.message)

  const rankingPayload = friendIds.map((friendId) => ({
    tierlist_id: created.id,
    friend_id: friendId,
    tier_id: null,
    position: null,
  }))

  const { data: rankings, error: rankingsError } = await supabase
    .from('rankings')
    .insert(rankingPayload)
    .select('id, tierlist_id, friend_id, tier_id, position')

  if (rankingsError) throw new Error(rankingsError.message)

  return {
    tierlist: created as Tierlist,
    rankings: (rankings ?? []) as Ranking[],
  }
}

export async function updateTierlist(input: {
  tierlistId: number
  name: string
  hostId: string
  friendIds: string[]
}): Promise<void> {
  assertConfigured()

  const name = input.name.trim()
  if (!name) throw new Error('Informe o nome da tier list.')
  if (!input.hostId) throw new Error('Selecione o host da tier list.')

  const nextFriendIds = new Set(
    [...new Set(input.friendIds)].filter((id) => id && id !== input.hostId),
  )
  if (nextFriendIds.size === 0) {
    throw new Error('Selecione pelo menos um amigo para tierlistar.')
  }

  const { error: updateError } = await supabase
    .from('tierlists')
    .update({
      name,
      created_by: input.hostId,
    })
    .eq('id', input.tierlistId)

  if (updateError) throw new Error(updateError.message)

  const { data: existingRankings, error: existingError } = await supabase
    .from('rankings')
    .select('id, friend_id')
    .eq('tierlist_id', input.tierlistId)

  if (existingError) throw new Error(existingError.message)

  const existingFriendIds = new Set(
    (existingRankings ?? []).map((row) => row.friend_id as string).filter(Boolean),
  )

  const toRemove = [...existingFriendIds].filter((id) => !nextFriendIds.has(id))
  const toAdd = [...nextFriendIds].filter((id) => !existingFriendIds.has(id))

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('rankings')
      .delete()
      .eq('tierlist_id', input.tierlistId)
      .in('friend_id', toRemove)

    if (deleteError) throw new Error(deleteError.message)
  }

  if (toAdd.length > 0) {
    const rankingPayload = toAdd.map((friendId) => ({
      tierlist_id: input.tierlistId,
      friend_id: friendId,
      tier_id: null,
      position: null,
    }))

    const { error: insertError } = await supabase.from('rankings').insert(rankingPayload)
    if (insertError) throw new Error(insertError.message)
  }
}

export async function deleteTierlist(tierlistId: number): Promise<void> {
  assertConfigured()

  const { error: rankingsError } = await supabase
    .from('rankings')
    .delete()
    .eq('tierlist_id', tierlistId)

  if (rankingsError) throw new Error(rankingsError.message)

  const { error: tierlistError } = await supabase.from('tierlists').delete().eq('id', tierlistId)

  if (tierlistError) throw new Error(tierlistError.message)
}

export async function saveTierlistRankings(
  tierlistId: number,
  items: Array<{ rankingId: number; tierId: number | null; position: number | null }>,
): Promise<void> {
  assertConfigured()

  if (items.length === 0) return

  const results = await Promise.all(
    items.map((item) =>
      supabase
        .from('rankings')
        .update({
          tier_id: item.tierId,
          position: item.position,
        })
        .eq('id', item.rankingId)
        .eq('tierlist_id', tierlistId),
    ),
  )

  const firstError = results.find((result) => result.error)?.error
  if (firstError) throw new Error(firstError.message)
}
