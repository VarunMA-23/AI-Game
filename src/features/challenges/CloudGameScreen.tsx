import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'

export default function CloudGameScreen() {
  const navigate = useNavigate()
  const phase = useGameStore((state) => state.phase)
  const startSession = useGameStore((state) => state.startSession)
  const finalizeSession = useGameStore((state) => state.finalizeSession)

  useEffect(() => {
    if (phase === 'landing') {
      startSession()
    }
  }, [phase, startSession])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== 'cloudgarden:continue') return
      finalizeSession()
      navigate('/persona', { replace: true })
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [finalizeSession, navigate])

  return (
    <main className="cloud-game-screen">
      <iframe
        src="/game/index.html"
        title="Cloudgarden game"
        allow="fullscreen; pointer-lock"
      />
    </main>
  )
}
