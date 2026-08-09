export const FIXED_RANKS = [
  {
    name: 'BESTO',
    label: 'besto friendo',
    icon: '👑',
    color: '#f2c94c',
    position: 0,
  },
  {
    name: 'RESENHA',
    label: 'resenha boa',
    icon: '😅',
    color: '#efb08a',
    position: 1,
  },
  {
    name: 'PARCAS',
    label: 'meus parças',
    icon: '👥',
    color: '#5aa8a0',
    position: 2,
  },
  {
    name: 'ATURO',
    label: 'aturo mas...',
    icon: '😬',
    color: '#c7b7e8',
    position: 3,
  },
  {
    name: 'NEUTRO',
    label: 'nem fede nem cheira',
    icon: '🥱',
    color: '#c4a882',
    position: 4,
  },
  {
    name: 'TIROS',
    label: 'trocaria tiros com esse filha da puta',
    icon: '🤬',
    color: '#f2f2f2',
    position: 5,
  },
  {
    name: 'LIXO',
    label: 'lixo humano',
    icon: '🗑️',
    color: '#9a9a9a',
    position: 6,
  },
  {
    name: 'MORTO',
    label: 'prefiriria morto',
    icon: '💀',
    color: '#6b4c8a',
    position: 7,
  },
] as const

export type RankName = (typeof FIXED_RANKS)[number]['name']

export type DropTarget = RankName | 'pool'
