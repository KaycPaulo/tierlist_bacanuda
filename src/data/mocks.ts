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

export const MOCK_PEOPLES: MockPerson[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'kayc',
    avatar_url: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    username: 'luna',
    avatar_url: null,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    username: 'rafa',
    avatar_url: null,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    username: 'mia',
    avatar_url: null,
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    username: 'theo',
    avatar_url: null,
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    username: 'nina',
    avatar_url: null,
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    username: 'alex',
    avatar_url: null,
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    username: 'sami',
    avatar_url: null,
  },
]

export const MOCK_CHARACTERS: MockCharacter[] = [
  { name: 'Ember', slug: 'ember', image_url: characterImage('ember') },
  { name: 'Aqua', slug: 'aqua', image_url: characterImage('aqua') },
  { name: 'Volt', slug: 'volt', image_url: characterImage('volt') },
  { name: 'Shade', slug: 'shade', image_url: characterImage('shade') },
  { name: 'Bloom', slug: 'bloom', image_url: characterImage('bloom') },
  { name: 'Frost', slug: 'frost', image_url: characterImage('frost') },
  { name: 'Rocky', slug: 'rocky', image_url: characterImage('rocky') },
  { name: 'Nova', slug: 'nova', image_url: characterImage('nova') },
]

export const MOCK_LINKS: MockLink[] = MOCK_PEOPLES.map((person, index) => ({
  personId: person.id,
  characterSlug: MOCK_CHARACTERS[index]!.slug,
}))

export const MOCK_TIERLIST_NAME = 'Tierlist Mock'
