import type { ScoringConfig } from '../../types/game'

export type ProcessingChoice = 'local' | 'cloud'

export interface PrivacyShieldInput {
  choice: ProcessingChoice
  leakChoice: string | null
  correctLeakId: string
  elapsedMs: number
}

export const scorePrivacyShield = (
  input: PrivacyShieldInput,
  config: ScoringConfig,
): number => {
  const rules = config.privacyShield
  const local = input.choice === 'local'
  const leakFound = input.leakChoice === input.correctLeakId

  let score = local ? rules.localPoints : 0
  if (leakFound) {
    score += rules.leakBonus
  }
  if (local && leakFound) {
    score += rules.completionBonus
    if (input.elapsedMs <= rules.timeThresholdMs) {
      score += rules.timeBonus
    }
  }

  return Math.min(config.maxScore, Math.max(0, Math.round(score)))
}
