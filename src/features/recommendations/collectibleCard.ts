import type { ChallengeId, PersonaId } from '../../types/game'

export type RarityTier = 'Standard' | 'Rare' | 'Epic' | 'Legendary'

export interface CollectibleStats {
  focus: number
  creativity: number
  privacy: number
  batteryCare: number
}

export interface CollectibleCardMeta {
  rarity: RarityTier
  title: string
  stats: CollectibleStats
}

const PERSONA_TITLES: Record<PersonaId, string> = {
  THE_LEARNER: 'Midnight Deadline Runner',
  THE_CREATOR: 'Quiet Studio Architect',
  THE_POWER_USER: 'Zero-Leak Strategist',
  THE_GAMER: 'Smooth Frame Tactician',
}

const toPct = (score: number | undefined): number =>
  Math.min(100, Math.max(25, Math.round(((score ?? 0) / 200) * 100)))

export const buildCollectibleCard = (
  persona: PersonaId | null,
  scores: Record<ChallengeId, number>,
  totalScore: number,
): CollectibleCardMeta => {
  const rarity: RarityTier =
    totalScore >= 850
      ? 'Legendary'
      : totalScore >= 650
        ? 'Epic'
        : totalScore >= 400
          ? 'Rare'
          : 'Standard'

  return {
    rarity,
    title: persona ? PERSONA_TITLES[persona] : 'Midnight Deadline Runner',
    stats: {
      focus: toPct(scores['study-sprint']),
      creativity: toPct(scores['creator-mode']),
      privacy: toPct(scores['privacy-shield']),
      batteryCare: toPct(scores['battery-escape']),
    },
  }
}

