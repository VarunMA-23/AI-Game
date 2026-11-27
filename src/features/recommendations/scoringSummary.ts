import { gameConfig } from '../../game/config/loadConfig'
import type { ChallengeId, ChallengeStatus } from '../../types/game'

export interface ScoringSummary {
  total: number
  completedCount: number
  durationMs: number
  achievement: string
  perChallenge: Array<{ id: ChallengeId; title: string; score: number; status: ChallengeStatus }>
}

const achievements: Record<ChallengeId, string> = {
  'study-sprint': 'Productivity Master',
  'creator-mode': 'Creative Genius',
  'privacy-shield': 'Privacy Guardian',
  'stream-night': 'Stream Star',
  'battery-escape': 'Efficiency Expert',
}

export const buildScoringSummary = (input: {
  scores: Record<ChallengeId, number>
  statuses: Record<ChallengeId, ChallengeStatus>
  startedAt: number | null
  completedAt: number | null
}): ScoringSummary => {
  const perChallenge = gameConfig.challenges.map((challenge) => ({
    id: challenge.id,
    title: challenge.title,
    score: input.scores[challenge.id] ?? 0,
    status: input.statuses[challenge.id] ?? 'pending',
  }))

  const highest = [...perChallenge].sort((left, right) => right.score - left.score)[0]
  const total = perChallenge.reduce((sum, item) => sum + item.score, 0)
  const completedCount = perChallenge.filter(
    (item) => item.status === 'completed',
  ).length

  return {
    total,
    completedCount,
    durationMs:
      input.startedAt && input.completedAt
        ? Math.max(0, input.completedAt - input.startedAt)
        : 0,
    achievement:
      total === 0 || perChallenge.every((item) => item.status !== 'completed')
        ? 'No achievement yet'
        : achievements[highest?.id ?? 'study-sprint'],
    perChallenge,
  }
}
