import { describe, expect, it } from 'vitest'
import { gameBus } from '../src/game/events/bus'

describe('typed event bus', () => {
  it('delivers payloads to subscribers and supports unsubscribe', () => {
    gameBus.clear()
    const seen: number[] = []
    const listener = (payload: { challengeId: string; remainingMs: number }) =>
      seen.push(payload.remainingMs)

    const unsubscribe = gameBus.on('timer:tick', listener)
    gameBus.emit('timer:tick', {
      challengeId: 'study-sprint',
      remainingMs: 20000,
    })
    unsubscribe()
    gameBus.emit('timer:tick', {
      challengeId: 'study-sprint',
      remainingMs: 10000,
    })

    expect(seen).toEqual([20000])
  })

  it('clears all listeners on session teardown', () => {
    gameBus.clear()
    let count = 0
    gameBus.on('game:caption', () => {
      count += 1
    })
    gameBus.emit('game:caption', { text: 'Ready', durationMs: 1000 })
    gameBus.clear()
    gameBus.emit('game:caption', { text: 'Ready', durationMs: 1000 })
    expect(count).toBe(1)
  })
})
