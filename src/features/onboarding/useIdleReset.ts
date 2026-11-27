import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'

const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart']

export const useIdleReset = (timeoutMs: number): void => {
  const navigate = useNavigate()

  useEffect(() => {
    const goIdle = () => {
      useGameStore.getState().resetSession()
      navigate('/', { replace: true })
    }

    let timer = window.setTimeout(goIdle, timeoutMs)

    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(goIdle, timeoutMs)
    }

    events.forEach((event) => window.addEventListener(event, reset, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach((event) => window.removeEventListener(event, reset))
    }
  }, [navigate, timeoutMs])
}
