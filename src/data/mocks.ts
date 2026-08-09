export interface MockPerson {
  id: string
  username: string
  avatar_url: string | null
}

export interface MockCharacter {
  name: string
  slug: string
  image_url: string
}

export interface MockLink {
  personId: string
  characterSlug: string
}

function characterImage(slug: string) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(slug)}`
}

function mockPersonId(index: number) {
  const hex = index.toString(16).padStart(12, '0')
  return `11111111-1111-4111-8111-${hex}`
}

const PEOPLE_USERNAMES = [
  'kayc',
  'luna',
  'rafa',
  'mia',
  'theo',
  'nina',
  'alex',
  'sami',
  'bruno',
  'clara',
  'diego',
  'eva',
  'felix',
  'gabi',
  'hugo',
  'iris',
  'joao',
  'kira',
  'leo',
  'meli',
  'nico',
  'olivia',
  'pedro',
  'quinn',
  'rita',
] as const

const CHARACTER_DEFS = [
  { name: 'Ember', slug: 'ember' },
  { name: 'Aqua', slug: 'aqua' },
  { name: 'Volt', slug: 'volt' },
  { name: 'Shade', slug: 'shade' },
  { name: 'Bloom', slug: 'bloom' },
  { name: 'Frost', slug: 'frost' },
  { name: 'Rocky', slug: 'rocky' },
  { name: 'Nova', slug: 'nova' },
  { name: 'Blaze', slug: 'blaze' },
  { name: 'Echo', slug: 'echo' },
  { name: 'Jade', slug: 'jade' },
  { name: 'Orbit', slug: 'orbit' },
  { name: 'Pixel', slug: 'pixel' },
  { name: 'Quark', slug: 'quark' },
  { name: 'Rune', slug: 'rune' },
  { name: 'Storm', slug: 'storm' },
  { name: 'Tide', slug: 'tide' },
  { name: 'Umber', slug: 'umber' },
  { name: 'Vex', slug: 'vex' },
  { name: 'Wisp', slug: 'wisp' },
  { name: 'Xeno', slug: 'xeno' },
  { name: 'Yara', slug: 'yara' },
  { name: 'Zephyr', slug: 'zephyr' },
  { name: 'Astra', slug: 'astra' },
  { name: 'Bolt', slug: 'bolt' },
] as const

export const MOCK_PEOPLES: MockPerson[] = PEOPLE_USERNAMES.map((username, index) => ({
  id: mockPersonId(index + 1),
  username,
  avatar_url: null,
}))

export const MOCK_CHARACTERS: MockCharacter[] = CHARACTER_DEFS.map((character) => ({
  name: character.name,
  slug: character.slug,
  image_url: characterImage(character.slug),
}))

export const MOCK_LINKS: MockLink[] = MOCK_PEOPLES.map((person, index) => ({
  personId: person.id,
  characterSlug: MOCK_CHARACTERS[index]!.slug,
}))

export const MOCK_TIERLIST_NAME = 'Tierlist Mock'
