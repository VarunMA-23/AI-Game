import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../src/store/gameStore'

beforeEach(() => {
  useGameStore.getState().resetSession()
})

describe('game store event reduction', () => {
  it('starts a local session in setup', () => {
    useGameStore.getState().startSession()
    const state = useGameStore.getState()
    expect(state.phase).toBe('setup')
    expect(state.sessionId.length).toBeGreaterThan(0)
    expect(state.startedAt).not.toBeNull()
  })

  it('advances both lanes when a packet is routed', () => {
    useGameStore.getState().startSession()
    useGameStore.getState().routePacket('stream-night', 'game', 'GPU', false)
    const state = useGameStore.getState()
    expect(state.packetRoutes.game).toEqual({ routedTo: 'GPU', fellBack: false })
    expect(state.race.leftProgress).toBeGreaterThan(0)
    expect(state.race.rightProgress).toBeGreaterThan(0)
  })

  it('records a fallback once and keeps the skipped segment tied', () => {
    useGameStore.getState().startSession()
    useGameStore
      .getState()
      .routePacket('stream-night', 'game', 'NPU', false)
    useGameStore.getState().recordFallback('game')
    useGameStore.getState().recordFallback('game')
    expect(useGameStore.getState().packetRoutes.game.fellBack).toBe(true)

    useGameStore.getState().skipChallenge('stream-night')
    const state = useGameStore.getState()
    expect(state.challengeStatus['stream-night']).toBe('skipped')
    expect(state.challengeScores['stream-night']).toBe(0)
    expect(state.race.leftProgress).toBe(state.race.rightProgress)
  })

  it('clears challenge routes when a challenge is reset', () => {
    useGameStore.getState().startSession()
    useGameStore
      .getState()
      .routePacket('creator-mode', 'background-removal', 'NPU', true)
    useGameStore.getState().setChallengeProgress('creator-mode', 120)
    expect(useGameStore.getState().race.rightProgress).toBeGreaterThan(0)

    useGameStore.getState().resetChallengeRoutes('creator-mode')
    const state = useGameStore.getState()
    expect(state.packetRoutes['background-removal']).toBeUndefined()
    expect(state.challengeScores['creator-mode']).toBe(0)
    expect(state.race.rightProgress).toBe(0)
  })

  it('caps challenge scores and ignores later completions', () => {
    useGameStore.getState().startSession()
    const payload = {
      challengeId: 'study-sprint' as const,
      status: 'completed' as const,
      score: 500,
      durationMs: 10000,
    }
    useGameStore.getState().completeChallenge(payload)
    useGameStore.getState().completeChallenge({ ...payload, score: 120 })
    const state = useGameStore.getState()
    expect(state.challengeScores['study-sprint']).toBe(200)
    expect(state.challengeStatus['study-sprint']).toBe('completed')
  })

  it('keeps the best partial score and clears on reset', () => {
    useGameStore.getState().startSession()
    useGameStore.getState().setChallengeProgress('study-sprint', 90)
    useGameStore.getState().setChallengeProgress('study-sprint', 60)
    expect(useGameStore.getState().challengeScores['study-sprint']).toBe(90)

    useGameStore.getState().resetSession()
    const state = useGameStore.getState()
    expect(state.phase).toBe('landing')
    expect(state.sessionId).toBe('')
    expect(state.race.leftProgress).toBe(0)
    expect(state.challengeScores['study-sprint']).toBe(0)
  })

  it('finalizes into store picks with a safe store fallback', () => {
    useGameStore.getState().startSession()
    useGameStore.getState().finalizeSession()
    const state = useGameStore.getState()
    expect(state.phase).toBe('store')
    expect(state.persona).not.toBeNull()
    expect(state.completedAt).not.toBeNull()
    expect(state.storeReady).toBe(false)
    expect(state.recommendedModelCodes).toEqual([])
  })
})
