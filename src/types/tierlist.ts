import type { RankName } from '@/constants/ranks'

export type { DropTarget, RankName } from '@/constants/ranks'

export interface Person {
  id: string
  username: string
  avatar_url: string | null
}

export interface Tierlist {
  id: number
  name: string
  is_active: boolean
  created_by: string | null
}

export interface Tier {
  id: number
  tierlist_id: number
  name: string
  icon: string
  position: number
}

export interface Character {
  id: number
  name: string
  slug: string
  image_url: string | null
  is_active: boolean
}

export interface Ranking {
  id: number
  tierlist_id: number
  user_id: string
  character_id: number
  tier_id: number
  position: number
}

/** Item do board: pessoa vinculada a um personagem (imagem vem do personagem). */
export interface BoardItem {
  characterId: number
  characterName: string
  imageUrl: string | null
  personId: string
  username: string
  rank: RankName | null
  rankingId: number | null
}

export interface FixedTierRow {
  name: RankName
  icon: string
  color: string
  position: number
  id: number
}

export interface PeopleCharacterLinkRow {
  id: number
  user_id: string
  character_id: number
  peoples: Person | Person[] | null
  character: Character | Character[] | null
}

export type TierlistStatus = 'completed' | 'in_progress' | 'pending'

export interface TierlistSummary {
  id: number
  name: string
  host: Person
  totalFriends: number
  rankedCount: number
  pendingCount: number
  status: TierlistStatus
}
