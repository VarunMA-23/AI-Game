import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { gameConfig, getChallenge } from '../src/game/config/loadConfig'
import { scoreCreatorMode } from '../src/game/scoring/creatorMode'
import type { PacketChoice } from '../src/game/scoring/creatorMode'

const packets = getChallenge('creator-mode').packets
const config = gameConfig.scoring
const correctRoutes: Record<string, PacketChoice> = {
  'background-removal': { engine: 'NPU', fellBack: false },
  'style-filter': { engine: 'GPU', fellBack: false },
}

describe('Creator Mode scorer', () => {
  it('awards 200 for the correct sequence and both correct routes', () => {
    const result = scoreCreatorMode(
      {
        sequence: ['background-removal', 'enhance', 'style-filter'],
        routes: correctRoutes,
        elapsedMs: 12000,
      },
      packets,
      config,
    )
    expect(result).toEqual({ score: 200, correctSteps: 3, correctRoutes: 2 })
  })

  it('counts a wrong order and a fallback route', () => {
    const result = scoreCreatorMode(
      {
        sequence: ['enhance', 'background-removal', 'style-filter'],
        routes: {
          ...correctRoutes,
          'background-removal': { engine: 'NPU', fellBack: true },
        },
        elapsedMs: 10000,
      },
      packets,
      config,
    )
    expect(result.correctSteps).toBe(0)
    expect(result.correctRoutes).toBe(1)
    expect(result.score).toBe(30)
  })

  it('ships all four pre-generated demo images locally', () => {
    const names = [
      'creator-before.svg',
      'creator-removed.svg',
      'creator-enhanced.svg',
      'creator-styled.svg',
    ]
    for (const name of names) {
      expect(
        existsSync(new URL(`../public/images/${name}`, import.meta.url)),
      ).toBe(true)
    }
  })

  it('never awards sequence bonuses after the time threshold', () => {
    const result = scoreCreatorMode(
      {
        sequence: ['background-removal', 'enhance', 'style-filter'],
        routes: correctRoutes,
        elapsedMs: 20000,
      },
      packets,
      config,
    )
    expect(result.score).toBe(180)
  })
})
