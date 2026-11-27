import type { EffectivePacket, Engine, ScoringConfig } from '../../types/game'
import { routeIsCorrect } from '../race/routing'

export interface PacketChoice {
  engine: Engine
  fellBack: boolean
}

export interface CreatorModeInput {
  sequence: string[]
  routes: Record<string, PacketChoice>
  elapsedMs: number
}

export interface CreatorModeResult {
  score: number
  correctSteps: number
  correctRoutes: number
}

export const scoreCreatorMode = (
  input: CreatorModeInput,
  packets: EffectivePacket[],
  config: ScoringConfig,
): CreatorModeResult => {
  const rules = config.creatorMode
  const expected = ['background-removal', 'enhance', 'style-filter']
  let correctSteps = 0

  for (let index = 0; index < expected.length; index += 1) {
    if (input.sequence[index] !== expected[index]) {
      break
    }
    correctSteps += 1
  }

  const correctRoutes = packets.filter((packet) => {
    const choice = input.routes[packet.id]
    return choice ? routeIsCorrect(packet, choice.engine, choice.fellBack) : false
  }).length

  const allCorrect = correctSteps === expected.length
  const bonus = allCorrect
    ? rules.completionBonus +
      (input.elapsedMs <= rules.timeThresholdMs ? rules.timeBonus : 0)
    : 0

  const raw =
    correctSteps * rules.pointsPerStep +
    correctRoutes * rules.pointsPerRoute +
    bonus

  return {
    score: Math.min(config.maxScore, Math.max(0, Math.round(raw))),
    correctSteps,
    correctRoutes,
  }
}
