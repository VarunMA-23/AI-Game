import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'

export const useRequireSession = (): boolean => {
  const persona = useGameStore((state) => state.persona)
  const startedAt = useGameStore((state) => state.startedAt)
  const navigate = useNavigate()
  const ready = Boolean(persona && startedAt)

  useEffect(() => {
    if (!ready) {
      navigate('/setup', { replace: true })
    }
  }, [navigate, ready])

  return ready
}
