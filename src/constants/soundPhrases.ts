export const SOUND_PHRASES = [
  {
    id: 'bora',
    label: 'Boraaaa!',
    src: '/sounds/bora.mp3',
  },
  {
    id: 'bosta',
    label: 'Bosta!',
    src: '/sounds/bosta.mp3',
  },
  {
    id: 'cala-a-boca',
    label: 'Cala a Boca!',
    src: '/sounds/cala_a_boca.mp3',
  },
  {
    id: 'ele-gosta',
    label: 'Ele gosta',
    src: '/sounds/ele_gosta.mp3',
  },
  {
    id: 'mentiroso',
    label: 'Mentiroso',
    src: '/sounds/mentiroso.mp3',
  },
  {
    id: 'toma',
    label: 'Tomaa!',
    src: '/sounds/toma.mp3',
  },
  {
    id: 'vai-dar-merda',
    label: 'Vai dar merda',
    src: '/sounds/vai_dar_merda.mp3',
  },
] as const

export type SoundPhraseId = (typeof SOUND_PHRASES)[number]['id']

export function getSoundPhrase(id: SoundPhraseId) {
  return SOUND_PHRASES.find((phrase) => phrase.id === id)
}
