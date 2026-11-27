import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import { gameConfig } from '../../game/config/loadConfig'
import { buildScoringSummary } from '../recommendations/scoringSummary'
import { useDeadlineNavigation } from '../challenges/useDeadlineNavigation'
import { useRequireSession } from '../challenges/useRequireSession'
import { useIdleReset } from '../onboarding/useIdleReset'
import { getPersonaDefinition } from '../../services/recommendations/loadPersona'
import { useGameStore } from '../../store/gameStore'

export default function PersonaRevealScreen() {
  const navigate = useNavigate()
  const sessionReady = useRequireSession()
  const persona = useGameStore((state) => state.persona)
  const scores = useGameStore((state) => state.challengeScores)
  const statuses = useGameStore((state) => state.challengeStatus)
  const startedAt = useGameStore((state) => state.startedAt)
  const completedAt = useGameStore((state) => state.completedAt)
  const race = useGameStore((state) => state.race)
  const setPhase = useGameStore((state) => state.setPhase)
  const definition = getPersonaDefinition(persona)
  const summary = buildScoringSummary({
    scores,
    statuses,
    startedAt,
    completedAt,
  })

  useIdleReset(45000)
  useDeadlineNavigation(startedAt, 152000, '/store')

  useEffect(() => {
    setPhase('persona', 0)
  }, [setPhase])

  if (!sessionReady) {
    return null
  }

  return (
    <EndingFrame
      kicker="Identity unlocked"
      title="YOU'VE UNLOCKED YOUR AI PC IDENTITY."
      footer={
        <button
          type="button"
          className="primary-button"
          onClick={() => navigate('/store')}
        >
          Next: Store Picks <ArrowRight size={18} aria-hidden="true" />
        </button>
      }
    >
      <div className="persona-result">
        <div className="persona-name">{definition.name}</div>
        <ul className="priority-list">
          {definition.priorities.map((priority) => (
            <li key={priority}>{priority}</li>
          ))}
        </ul>
      </div>

      <div className="race-result">
        <div className="race-result-row">
          <span>Without NPU routing</span>
          <div className="race-result-track">
            <span
              className="race-result-fill race-result-fill--left"
              style={{ width: `${race.leftProgress * 100}%` }}
            />
          </div>
        </div>
        <div className="race-result-row">
          <span>With NPU routing</span>
          <div className="race-result-track">
            <span
              className="race-result-fill race-result-fill--right"
              style={{ width: `${race.rightProgress * 100}%` }}
            />
          </div>
        </div>
        <p className="disclosure">{gameConfig.race.disclosure}</p>
      </div>

      <div className="score-strip">
        <span>{summary.total} / 1000</span>
        <span>{summary.completedCount} of 5 completed</span>
        <span>{summary.achievement}</span>
        <span>{Math.round(summary.durationMs / 1000)}s in session</span>
      </div>
    </EndingFrame>
  )
}
