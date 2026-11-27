import { useCallback, useEffect, useRef } from 'react'
import { getChallengeByIndex } from '../../game/config/loadConfig'
import { gameBus } from '../../game/events/bus'
import { useGameStore } from '../../store/gameStore'
import type { Phase } from '../../types/game'

const guidedPhases: Phase[] = ['setup', 'challenges', 'race-finish']

export const useSessionTimeline = (): (() => void) => {
  const phase = useGameStore((state) => state.phase)
  const currentChallenge = useGameStore((state) => state.currentChallenge)
  const startedAt = useGameStore((state) => state.startedAt)
  const guided = guidedPhases.includes(phase)
  const segmentStartedAt = useRef<number>(Date.now())

  const advance = useCallback(() => {
    const state = useGameStore.getState()
    if (state.phase === 'setup') {
      state.setPhase('challenges', 1)
      return
    }
    if (state.phase === 'challenges') {
      const current = getChallengeByIndex(state.currentChallenge)
      if (current && state.challengeStatus[current.id] === 'pending') {
        gameBus.emit('challenge:complete', {
          challengeId: current.id,
          status: 'timed-out',
          score: state.challengeScores[current.id],
          durationMs: current.timeLimitMs,
        })
      }
      if (state.currentChallenge < 5) {
        state.setPhase('challenges', state.currentChallenge + 1)
      } else {
        state.setPhase('race-finish', 0)
      }
      return
    }
    if (state.phase === 'race-finish') {
      state.finalizeSession()
    }
  }, [])

  useEffect(() => {
    if (!startedAt || !guided) {
      return
    }

    segmentStartedAt.current = Date.now()
    const challenge =
      phase === 'challenges' ? getChallengeByIndex(currentChallenge) : undefined
    const limitMs = challenge ? challenge.timeLimitMs : 0

    useGameStore.getState().setRemainingMs(limitMs)

    if (phase !== 'challenges' || !challenge) {
      return
    }

    const interval = window.setInterval(() => {
      const state = useGameStore.getState()
      if (state.challengeStatus[challenge.id] !== 'pending') {
        return
      }
      const elapsed = Date.now() - segmentStartedAt.current
      const remaining = Math.max(0, limitMs - elapsed)
      state.setRemainingMs(remaining)

      if (remaining <= 0) {
        window.clearInterval(interval)
        gameBus.emit('challenge:complete', {
          challengeId: challenge.id,
          status: 'timed-out',
          score: state.challengeScores[challenge.id],
          durationMs: limitMs,
        })
      }
    }, 200)

    return () => window.clearInterval(interval)
  }, [startedAt, guided, phase, currentChallenge])

  return advance
}
