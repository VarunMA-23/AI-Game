import type { EffectivePacket, Engine, ScoringConfig } from '../../types/game'
import { clamp, routeIsCorrect } from '../race/routing'

export interface BatteryEscapeChoice {
  engine: Engine
  fellBack: boolean
}

export interface BatteryEscapeInput {
  routes: Record<string, BatteryEscapeChoice>
  elapsedMs: number
}

export interface BatteryEscapeResult {
  score: number
  correctRoutes: number
  remainingBattery: number
  subscores: {
    batteryEscape: number
  }
}

export const batteryDrainFor = (
  packet: EffectivePacket,
  choice: BatteryEscapeChoice,
  config: ScoringConfig,
): number => {
  const rules = config.batteryEscape

  if (choice.engine === 'NPU' && packet.npuBenefit === 'none') {
    return 0
  }
  if (choice.engine === 'NPU' && !choice.fellBack && packet.npuBenefit === 'high') {
    return rules.highNpuDrain
  }
  if (choice.engine === 'NPU' && !choice.fellBack && packet.npuBenefit === 'low') {
    return rules.lowNpuDrain
  }
  if (choice.engine === 'GPU' && packet.gpuSuitable && packet.npuBenefit === 'none') {
    return rules.gpuSuitableDrain
  }
  return rules.baseDrain
}

export const scoreBatteryEscape = (
  input: BatteryEscapeInput,
  packets: EffectivePacket[],
  config: ScoringConfig,
): BatteryEscapeResult => {
  const rules = config.batteryEscape
  const correct = packets.filter((packet) => {
    const choice = input.routes[packet.id]
    return choice
      ? routeIsCorrect(packet, choice.engine, choice.fellBack)
      : false
  }).length

  const drain = packets.reduce((total, packet) => {
    const choice = input.routes[packet.id]
    return choice ? total + batteryDrainFor(packet, choice, config) : total
  }, 0)
  const remainingBattery = clamp(rules.startingBattery - drain, 0, rules.startingBattery)

  const bonus =
    correct === packets.length && input.elapsedMs <= rules.timeThresholdMs
      ? rules.timeBonus
      : 0
  const raw =
    correct * rules.pointsPerCorrectRoute +
    (remainingBattery / rules.startingBattery) * rules.batteryWeight +
    bonus

  return {
    score: Math.min(config.maxScore, Math.max(0, Math.round(raw))),
    correctRoutes: correct,
    remainingBattery: Math.round(remainingBattery),
    subscores: { batteryEscape: Math.round(remainingBattery) },
  }
}
