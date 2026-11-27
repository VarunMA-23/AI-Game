import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
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

  const skipToResults = () => {
    if (useGameStore.getState().phase === 'landing') {
      startSession()
    }
    finalizeSession()
    navigate('/store', { replace: true })
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== 'cloudgarden:continue') return
      finalizeSession()
      navigate('/store', { replace: true })
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [finalizeSession, navigate])

  return (
    <main className="cloud-game-screen">
      <iframe
        src="/game/index.html?autostart=1"
        title="Cloudgarden game"
        allow="fullscreen; pointer-lock"
      />
      <button type="button" className="skip-game-button" onClick={skipToResults}>
        Skip game <ArrowRight size={18} aria-hidden="true" />
      </button>
    </main>
  )
}
