import type {
  ChallengeId,
  EffectivePacket,
  Engine,
  PacketRoute,
  RaceConfig,
  RaceProgress,
} from '../../types/game'

export interface RouteOutcome {
  packet: EffectivePacket
  chosen: Engine
  engine: Engine
  fellBack: boolean
  caption: string | null
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const clamp01 = (value: number): number => clamp(value, 0, 1)

export const getFallbackCaption = (
  packet: EffectivePacket,
  config: RaceConfig,
): string =>
  config.fallbackCaptionTemplate.replace('{engine}', packet.fallbackEngine)

export const resolveRoute = (
  packet: EffectivePacket,
  chosen: Engine,
  config: RaceConfig,
): RouteOutcome => {
  if (chosen === 'NPU' && !packet.npuCompatible) {
    return {
      packet,
      chosen,
      engine: packet.fallbackEngine,
      fellBack: true,
      caption: getFallbackCaption(packet, config),
    }
  }

  return { packet, chosen, engine: chosen, fellBack: false, caption: null }
}

export const leftLaneEngine = (packet: EffectivePacket): Engine =>
  packet.defaultEngine === 'NPU' ? packet.fallbackEngine : packet.defaultEngine

export const routeIsCorrect = (
  packet: EffectivePacket,
  engine: Engine,
  fellBack: boolean,
): boolean => !fellBack && engine === packet.defaultEngine

export const applyFallbackDelay = (
  packet: EffectivePacket,
  fellBack: boolean,
  elapsedMs: number,
): number => (fellBack ? elapsedMs + packet.fallbackDelayMs : elapsedMs)

const rightLanePoints = (
  packet: EffectivePacket,
  engine: Engine,
  fellBack: boolean,
  config: RaceConfig,
): number => {
  const factors = config.progress
  let factor = factors.wrongRouteFactor

  if (fellBack) {
    factor = factors.fallbackFactor
  } else if (engine === 'NPU' && packet.npuCompatible) {
    factor = factors.npuRouteFactor
  } else if (engine === packet.defaultEngine) {
    factor = factors.suitableRouteFactor
  }

  return packet.illustrativeRoutingWeight * factor
}

export const computeRaceProgress = (
  packets: EffectivePacket[],
  routes: Record<string, PacketRoute>,
  config: RaceConfig,
  skippedChallenges: ReadonlySet<ChallengeId> = new Set(),
): RaceProgress => {
  let left = 0
  let right = 0
  let total = 0

  for (const packet of packets) {
    total += packet.illustrativeRoutingWeight
    const route = routes[packet.id]
    const skipped = skippedChallenges.has(packet.challengeId)

    if (skipped) {
      left += packet.illustrativeRoutingWeight * config.progress.leftLaneFactor
      right += packet.illustrativeRoutingWeight * config.progress.leftLaneFactor
      continue
    }

    if (!route) {
      continue
    }

    left += packet.illustrativeRoutingWeight * config.progress.leftLaneFactor
    right += rightLanePoints(packet, route.routedTo, route.fellBack, config)
  }

  const target = total * config.progress.leftLaneFactor

  if (target <= 0) {
    return { leftProgress: 0, rightProgress: 0 }
  }

  return {
    leftProgress: clamp01(left / target),
    rightProgress: clamp01(right / target),
  }
}
