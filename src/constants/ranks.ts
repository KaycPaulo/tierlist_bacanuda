export const FIXED_RANKS = [
  { name: 'S', icon: 'S', color: '#ff7b7b', position: 0 },
  { name: 'A', icon: 'A', color: '#ffb347', position: 1 },
  { name: 'B', icon: 'B', color: '#ffe066', position: 2 },
  { name: 'C', icon: 'C', color: '#8fd694', position: 3 },
  { name: 'D', icon: 'D', color: '#7eb6ff', position: 4 },
] as const

export type RankName = (typeof FIXED_RANKS)[number]['name']

export type DropTarget = RankName | 'pool'
