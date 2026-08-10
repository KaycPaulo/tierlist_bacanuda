export type DropTarget = string | 'pool'

export interface Person {
  id: string
  username: string
  hostname: string | null
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
  name: string
  icon: string
  color: string
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
  friend_id: string
  tier_id: number | null
  position: number | null
}

/** Item do board: amigo da tabela rankings (avatar vem de peoples). */
export interface BoardItem {
  rankingId: number
  personId: string
  username: string
  imageUrl: string | null
  /** Nome da tier; null = ainda não ranqueado (pool). */
  rank: string | null
  tierId: number | null
  /** Ordem na fila (pool) ou dentro da tier. */
  order: number
}

export interface BoardTier {
  id: number
  name: string
  icon: string
  color: string
  position: number
}

export interface PeopleCharacterLinkRow {
  id: number
  user_id: string
  character_id: number
  peoples: Person | Person[] | null
  character: Character | Character[] | null
}

export type TierlistStatus = 'completed' | 'in_progress'

export interface TierlistSummary {
  id: number
  name: string
  host: Person
  totalFriends: number
  rankedCount: number
  pendingCount: number
  status: TierlistStatus
}
