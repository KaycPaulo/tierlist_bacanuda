import { isSupabaseConfigured, supabase } from './supabase'
import type { Character, Person } from '@/types/tierlist'

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createPerson(input: {
  username: string
  hostname?: string
  avatarUrl?: string
}): Promise<Person> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  const username = input.username.trim()
  if (!username) throw new Error('Informe o username da pessoa.')

  const payload = {
    id: crypto.randomUUID(),
    username,
    hostname: input.hostname?.trim() || null,
    avatar_url: input.avatarUrl?.trim() || null,
  }

  const { data, error } = await supabase.from('peoples').insert(payload).select('*').single()
  if (error) throw new Error(error.message)
  return data as Person
}

export async function getPerson(personId: string): Promise<Person> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  const { data, error } = await supabase
    .from('peoples')
    .select('*')
    .eq('id', personId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Amigo não encontrado')
  return data as Person
}

export async function updatePerson(
  personId: string,
  input: {
    username?: string
    hostname?: string
    avatarUrl?: string
  },
): Promise<Person> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  const payload: Partial<Person> = {}

  if (input.username !== undefined) {
    const username = input.username.trim()
    if (!username) throw new Error('Informe o username da pessoa.')
    payload.username = username
  }

  if (input.hostname !== undefined) {
    payload.hostname = input.hostname?.trim() || null
  }

  if (input.avatarUrl !== undefined) {
    payload.avatar_url = input.avatarUrl?.trim() || null
  }

  const { data, error } = await supabase
    .from('peoples')
    .update(payload)
    .eq('id', personId)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Amigo não encontrado para atualizar')
  return data as Person
}

export async function deletePerson(personId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  const { error } = await supabase.from('peoples').delete().eq('id', personId)

  if (error) throw new Error(error.message)
}

export async function listPeoples(): Promise<Person[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  const { data, error } = await supabase.from('peoples').select('*').order('username', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Person[]
}

export async function listCharacters(): Promise<Character[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  const { data, error } = await supabase
    .from('character')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Character[]
}

export async function createCharacter(input: {
  name: string
  slug?: string
  imageUrl?: string
}): Promise<Character> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  const name = input.name.trim()
  if (!name) throw new Error('Informe o nome do personagem.')

  const slug = (input.slug?.trim() || slugify(name)).toLowerCase()
  if (!slug) throw new Error('Informe um slug válido.')

  const payload = {
    name,
    slug,
    image_url: input.imageUrl?.trim() || null,
    is_active: true,
  }

  const { data, error } = await supabase.from('character').insert(payload).select('*').single()
  if (error) throw new Error(error.message)
  return data as Character
}

/** Garante uma tierlist ativa para vincular pessoas ↔ personagens. */
export async function ensureActiveTierlist(createdBy?: string | null): Promise<number> {
  const { data: existing, error: selectError } = await supabase
    .from('tierlists')
    .select('id')
    .eq('is_active', true)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (selectError) throw new Error(selectError.message)
  if (existing?.id != null) return existing.id

  const { data: created, error: insertError } = await supabase
    .from('tierlists')
    .insert({
      name: 'Tierlist principal',
      is_active: true,
      created_by: createdBy ?? null,
    })
    .select('id')
    .single()

  if (insertError) throw new Error(insertError.message)
  return created.id as number
}

/** Vincula (ou atualiza) personagem de uma pessoa na tierlist ativa. */
export async function linkPersonToCharacter(personId: string, characterId: number) {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  const tierlistId = await ensureActiveTierlist(personId)

  const { data: existing, error: findError } = await supabase
    .from('tierlist_people_characters')
    .select('id')
    .eq('tierlist_id', tierlistId)
    .eq('user_id', personId)
    .maybeSingle()

  if (findError) throw new Error(findError.message)

  if (existing?.id != null) {
    const { error } = await supabase
      .from('tierlist_people_characters')
      .update({ character_id: characterId })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('tierlist_people_characters').insert({
    tierlist_id: tierlistId,
    user_id: personId,
    character_id: characterId,
  })
  if (error) throw new Error(error.message)
}

/** Cadastra pessoa + personagem já vinculados. */
export async function createLinkedPair(input: {
  username: string
  personAvatarUrl?: string
  characterName: string
  characterSlug?: string
  characterImageUrl?: string
}) {
  const person = await createPerson({
    username: input.username,
    avatarUrl: input.personAvatarUrl,
  })
  const character = await createCharacter({
    name: input.characterName,
    slug: input.characterSlug,
    imageUrl: input.characterImageUrl,
  })
  await linkPersonToCharacter(person.id, character.id)
  return { person, character }
}

export async function listPersonCharacterLinks() {
  const { data, error } = await supabase
    .from('tierlist_people_characters')
    .select('user_id, character_id')
  if (error) throw new Error(error.message)
  return (data ?? []) as { user_id: string; character_id: number }[]
}
