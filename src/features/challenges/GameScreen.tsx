import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RaceHud from '../../components/game-ui/RaceHud'
import WebGameStage from '../../components/game-ui/WebGameStage'
import { useGameStore } from '../../store/gameStore'
import type { Phase } from '../../types/game'
import { useGameBridge } from './useGameBridge'
import { useSessionTimeline } from './useSessionTimeline'

const guidedPhases: Phase[] = ['setup', 'challenges', 'race-finish']

const endingRoutes: Record<string, string> = {
  persona: '/persona',
  store: '/store',
  value: '/value',
  'next-step': '/next-step',
  staff: '/staff',
}

export default function GameScreen() {
  useGameBridge()
  const advance = useSessionTimeline()

  const phase = useGameStore((state) => state.phase)
  const navigate = useNavigate()

  useEffect(() => {
    if (guidedPhases.includes(phase)) {
      return
    }
    navigate(endingRoutes[phase] ?? '/', { replace: true })
  }, [navigate, phase])

  if (!guidedPhases.includes(phase)) {
    return <main className="session-complete" aria-live="polite" />
  }

  return (
    <main className="game-screen">
      <RaceHud onSkip={advance} />
      <div className="game-stage">
        <WebGameStage onAdvance={advance} />
      </div>
    </main>
  )
}
