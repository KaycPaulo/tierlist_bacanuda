export const REACTIONS = [
  {
    id: 'tomato',
    label: 'Tomate',
    emoji: '🍅',
    color: '#d64545',
  },
  {
    id: 'laugh',
    label: 'Risada',
    emoji: '😆',
    color: '#f2c94c',
  },
  {
    id: 'swear',
    label: 'Xingamento',
    emoji: '🤬',
    color: '#c0392b',
  },
  {
    id: 'heart',
    label: 'Coração',
    emoji: '❤️',
    color: '#e85d75',
  },
  {
    id: 'clap',
    label: 'Aplauso',
    emoji: '👏',
    color: '#f0a35e',
  },
  {
    id: 'poop',
    label: 'Coco',
    emoji: '💩',
    color: '#8b5a2b',
  },
] as const

export type ReactionId = (typeof REACTIONS)[number]['id']

export function getReaction(id: ReactionId) {
  return REACTIONS.find((reaction) => reaction.id === id)
}
