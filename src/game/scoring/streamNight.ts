import type { EffectivePacket, Engine, ScoringConfig } from '../../types/game'
import { clamp, routeIsCorrect } from '../race/routing'

export interface StreamNightChoice {
  engine: Engine
  fellBack: boolean
}

export interface StreamNightInput {
  routes: Record<string, StreamNightChoice>
  elapsedMs: number
}

export interface StreamNightResult {
  score: number
  correctRoutes: number
  stability: number
  subscores: {
    gamingRouting: number
    multitaskingRouting: number
  }
}

export const scoreStreamNight = (
  input: StreamNightInput,
  packets: EffectivePacket[],
  config: ScoringConfig,
): StreamNightResult => {
  const rules = config.streamNight
  const isCorrect = (id: string): boolean => {
    const packet = packets.find((item) => item.id === id)
    const choice = input.routes[id]
    return packet && choice
      ? routeIsCorrect(packet, choice.engine, choice.fellBack)
      : false
  }

  const correct = packets.filter((packet) => {
    const choice = input.routes[packet.id]
    return choice
      ? routeIsCorrect(packet, choice.engine, choice.fellBack)
      : false
  }).length

  const stability = clamp(
    100 - (packets.length - correct) * rules.stabilityPenaltyPerWrongRoute,
    0,
    100,
  )
  const bonus =
    correct === packets.length && input.elapsedMs <= rules.timeThresholdMs
      ? rules.timeBonus
      : 0
  const raw =
    correct * rules.pointsPerCorrectRoute +
    (stability / 100) * rules.stabilityWeight +
    bonus

  const multitaskingCorrect = (Number(isCorrect('stream')) + Number(isCorrect('call-blur'))) / 2

  return {
    score: Math.min(config.maxScore, Math.max(0, Math.round(raw))),
    correctRoutes: correct,
    stability: Math.round(stability),
    subscores: {
      gamingRouting: Math.round(stability * (isCorrect('game') ? 1 : 0.4)),
      multitaskingRouting: Math.round(stability * multitaskingCorrect),
    },
  }
}
