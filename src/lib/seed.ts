import { FIXED_RANKS } from '@/constants/ranks'
import {
  MOCK_CHARACTERS,
  MOCK_LINKS,
  MOCK_PEOPLES,
  MOCK_TIERLIST_NAME,
} from '@/data/mocks'
import { supabase } from '@/lib/supabase'

function getErrorMessage(err: unknown) {
  if (typeof err === 'object' && err && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  if (err instanceof Error) return err.message
  return 'Falha ao popular mocks no Supabase.'
}

export async function seedMockData() {
  const peoplesCount = await supabase
    .from('peoples')
    .select('id', { count: 'exact', head: true })

  if (peoplesCount.error) throw peoplesCount.error
  if ((peoplesCount.count ?? 0) > 0) return { seeded: false }

  const { error: peoplesError } = await supabase.from('peoples').insert(
    MOCK_PEOPLES.map((person) => ({
      id: person.id,
      username: person.username,
      avatar_url: person.avatar_url,
    })),
  )
  if (peoplesError) throw new Error(`peoples: ${getErrorMessage(peoplesError)}`)

  const { error: charactersError } = await supabase.from('character').insert(
    MOCK_CHARACTERS.map((character) => ({
      name: character.name,
      slug: character.slug,
      image_url: character.image_url,
      is_active: true,
    })),
  )
  if (charactersError) throw new Error(`character: ${getErrorMessage(charactersError)}`)

  const { data: characters, error: charactersFetchError } = await supabase
    .from('character')
    .select('id, slug')
    .in(
      'slug',
      MOCK_CHARACTERS.map((character) => character.slug),
    )
  if (charactersFetchError) throw charactersFetchError

  const characterIdBySlug = new Map(
    (characters ?? []).map((character) => [character.slug, character.id as number]),
  )

  const ownerId = MOCK_PEOPLES[0]!.id
  const { data: tierlist, error: tierlistError } = await supabase
    .from('tierlists')
    .insert({
      name: MOCK_TIERLIST_NAME,
      is_active: true,
      created_by: ownerId,
    })
    .select('id')
    .single()
  if (tierlistError) throw new Error(`tierlists: ${getErrorMessage(tierlistError)}`)

  const { error: tiersError } = await supabase.from('tiers').insert(
    FIXED_RANKS.map((rank) => ({
      tierlist_id: tierlist.id,
      name: rank.name,
      icon: rank.icon,
      position: rank.position,
    })),
  )
  if (tiersError) throw new Error(`tiers: ${getErrorMessage(tiersError)}`)

  const links = MOCK_LINKS.map((link) => {
    const characterId = characterIdBySlug.get(link.characterSlug)
    if (!characterId) {
      throw new Error(`Personagem mock "${link.characterSlug}" não encontrado após insert.`)
    }

    return {
      tierlist_id: tierlist.id,
      user_id: link.personId,
      character_id: characterId,
    }
  })

  const { error: linksError } = await supabase.from('tierlist_people_characters').insert(links)
  if (linksError) {
    throw new Error(`tierlist_people_characters: ${getErrorMessage(linksError)}`)
  }

  return { seeded: true, tierlistId: tierlist.id as number }
}
