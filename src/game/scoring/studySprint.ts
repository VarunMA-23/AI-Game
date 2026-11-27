import type { ScoringConfig } from '../../types/game'

export interface StudySprintInput {
  correct: number
  incorrect: number
  elapsedMs: number
  completed: boolean
}

export const scoreStudySprint = (
  input: StudySprintInput,
  config: ScoringConfig,
): number => {
  const rules = config.studySprint
  const raw =
    input.correct * rules.pointsPerCorrect -
    input.incorrect * rules.penaltyPerIncorrect

  const fullyCorrect = input.completed && input.correct === 5 && input.incorrect === 0
  const bonus = fullyCorrect
    ? rules.completionBonus +
      (input.elapsedMs <= rules.timeThresholdMs ? rules.timeBonus : 0)
    : 0

  return Math.min(config.maxScore, Math.max(0, Math.round(raw + bonus)))
}
