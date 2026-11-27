import { useEffect } from 'react'
import { gameBus } from '../../game/events/bus'
import { useGameStore } from '../../store/gameStore'

export const useGameBridge = (): void => {
  useEffect(() => {
    const timeouts: number[] = []
    const state = () => useGameStore.getState()

    const unsubscribers = [
      gameBus.on('packet:routed', (payload) => {
        state().routePacket(
          payload.challengeId,
          payload.packetId,
          payload.routedTo,
          payload.fellBack,
        )
      }),
      gameBus.on('packet:fallback', (payload) => {
        state().recordFallback(payload.packetId)
      }),
      gameBus.on('race:update', (payload) => {
        state().updateRace(payload)
      }),
      gameBus.on('timer:tick', (payload) => {
        state().setRemainingMs(payload.remainingMs)
      }),
      gameBus.on('challenge:progress', (payload) => {
        state().setChallengeProgress(payload.challengeId, payload.score)
      }),
      gameBus.on('challenge:complete', (payload) => {
        state().completeChallenge(payload)
      }),
      gameBus.on('game:caption', (payload) => {
        state().setCaption(payload.text)
        if (payload.durationMs > 0) {
          timeouts.push(
            window.setTimeout(() => {
              if (state().caption === payload.text) {
                state().setCaption('')
              }
            }, payload.durationMs),
          )
        }
      }),
    ]

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
      for (const timeout of timeouts) {
        window.clearTimeout(timeout)
      }
      state().setCaption('')
    }
  }, [])
}
