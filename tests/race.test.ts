import { describe, expect, it } from 'vitest'
import { gameConfig, getChallenge, segmentAt } from '../src/game/config/loadConfig'
import {
  applyFallbackDelay,
  computeRaceProgress,
  getFallbackCaption,
  leftLaneEngine,
  resolveRoute,
  routeIsCorrect,
} from '../src/game/race/routing'
import type { PacketRoute } from '../src/types/game'

const streamPackets = getChallenge('stream-night').packets
const game = streamPackets.find((packet) => packet.id === 'game')
const callBlur = streamPackets.find((packet) => packet.id === 'call-blur')

if (!game || !callBlur) {
  throw new Error('Missing Stream Night packets')
}

describe('game config', () => {
  it('loads all five challenges with unique packets', () => {
    expect(gameConfig.challenges).toHaveLength(5)
    const ids = gameConfig.challenges.flatMap((challenge) =>
      challenge.packets.map((packet) => packet.id),
    )
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(12)
  })

  it('uses the exact required disclosure and fallback copy', () => {
    expect(gameConfig.race.disclosure).toBe(
      'Illustrative routing simulation. Not a benchmark. Real performance and battery life depend on the model, software and workload. Whether a task can use the NPU depends on the app.',
    )
    expect(getFallbackCaption(game, gameConfig.race)).toBe(
      "This task isn't set up for the NPU here. It ran on the GPU instead.",
    )
  })

  it('maps timeline boundaries to the specified phases', () => {
    expect(segmentAt(0).phase).toBe('setup')
    expect(segmentAt(4999).phase).toBe('setup')
    expect(segmentAt(5000).challengeIndex).toBe(1)
    expect(segmentAt(130000).phase).toBe('race-finish')
    expect(segmentAt(180000).phase).toBe('next-step')
  })
})

describe('routing', () => {
  it('falls back to the configured engine once for an unsupported NPU route', () => {
    const outcome = resolveRoute(game, 'NPU', gameConfig.race)
    expect(outcome.fellBack).toBe(true)
    expect(outcome.engine).toBe('GPU')
    expect(outcome.caption).toBe(
      "This task isn't set up for the NPU here. It ran on the GPU instead.",
    )
    expect(applyFallbackDelay(game, true, 1200)).toBe(2200)
    expect(applyFallbackDelay(game, false, 1200)).toBe(1200)
  })

  it('keeps an NPU-compatible packet on the NPU', () => {
    const outcome = resolveRoute(callBlur, 'NPU', gameConfig.race)
    expect(outcome.fellBack).toBe(false)
    expect(outcome.engine).toBe('NPU')
    expect(routeIsCorrect(callBlur, outcome.engine, outcome.fellBack)).toBe(true)
  })

  it('never routes the left lane through the NPU', () => {
    const allPackets = gameConfig.challenges.flatMap((c) => c.packets)
    for (const packet of allPackets) {
      expect(leftLaneEngine(packet)).not.toBe('NPU')
    }
  })

  it('is deterministic for identical route inputs', () => {
    const packets = [game, callBlur]
    const routes: Record<string, PacketRoute> = {
      game: { routedTo: 'GPU', fellBack: false },
      'call-blur': { routedTo: 'NPU', fellBack: false },
    }
    const first = computeRaceProgress(packets, routes, gameConfig.race)
    const second = computeRaceProgress(packets, routes, gameConfig.race)
    expect(first).toEqual(second)
    expect(first.rightProgress).toBeGreaterThanOrEqual(first.leftProgress)
  })

  it('gives both lanes the same progress for a skipped challenge', () => {
    const packets = [game, callBlur]
    const progress = computeRaceProgress(
      packets,
      {},
      gameConfig.race,
      new Set(['stream-night']),
    )
    expect(progress.leftProgress).toBe(progress.rightProgress)
    expect(progress.leftProgress).toBe(1)
  })

  it('does not advance a lane before a packet is routed', () => {
    const progress = computeRaceProgress([game], {}, gameConfig.race)
    expect(progress.leftProgress).toBe(0)
    expect(progress.rightProgress).toBe(0)
  })
})
