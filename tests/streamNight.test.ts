import { describe, expect, it } from 'vitest'
import { gameConfig, getChallenge } from '../src/game/config/loadConfig'
import { scoreStreamNight } from '../src/game/scoring/streamNight'
import type { StreamNightChoice } from '../src/game/scoring/streamNight'

const packets = getChallenge('stream-night').packets
const config = gameConfig.scoring
const routes: Record<string, StreamNightChoice> = {
  game: { engine: 'GPU', fellBack: false },
  stream: { engine: 'GPU', fellBack: false },
  'call-blur': { engine: 'NPU', fellBack: false },
}

describe('Stream Night scorer', () => {
  it('awards 200 for correct routes finished inside the time threshold', () => {
    const result = scoreStreamNight(
      { routes, elapsedMs: 12000 },
      packets,
      config,
    )
    expect(result.score).toBe(200)
    expect(result.stability).toBe(100)
    expect(result.subscores).toEqual({ gamingRouting: 100, multitaskingRouting: 100 })
  })

  it('penalises a game fallback and keeps the routing subscores honest', () => {
    const result = scoreStreamNight(
      {
        routes: {
          ...routes,
          game: { engine: 'GPU', fellBack: true },
        },
        elapsedMs: 10000,
      },
      packets,
      config,
    )
    expect(result.correctRoutes).toBe(2)
    expect(result.stability).toBe(66)
    expect(result.score).toBe(123)
    expect(result.subscores).toEqual({ gamingRouting: 26, multitaskingRouting: 66 })
  })

  it('removes the time bonus after the threshold', () => {
    const result = scoreStreamNight(
      { routes, elapsedMs: 20000 },
      packets,
      config,
    )
    expect(result.score).toBe(185)
  })

  it('keeps the frame-stability meter illustrative in source copy', () => {
    const challenge = getChallenge('stream-night')
    const copy = [
      challenge.scenario,
      challenge.objective,
      challenge.educationalMessage,
      ...challenge.packets.map((packet) => packet.caption),
    ].join(' ')
    expect(copy).not.toMatch(/FPS|frame time|latency/i)
    expect(challenge.packets.find((packet) => packet.id === 'game')?.npuCompatible).toBe(false)
  })
})
