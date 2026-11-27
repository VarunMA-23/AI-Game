import { useEffect } from 'react'
import { ArrowRight, Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import { gameConfig } from '../../game/config/loadConfig'
import { buildCollectibleCard } from '../recommendations/collectibleCard'
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
  const maxCombo = useGameStore((state) => state.maxCombo ?? 0)
  const bossCleared = useGameStore((state) => state.bossCleared ?? false)
  const setPhase = useGameStore((state) => state.setPhase)
  const definition = getPersonaDefinition(persona)
  const summary = buildScoringSummary({
    scores,
    statuses,
    startedAt,
    completedAt,
  })
  const card = buildCollectibleCard(persona, scores, summary.total)

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
      kicker="Collectible Persona Card"
      title="YOUR AI PC TRADING CARD."
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
      <div className={`trading-card trading-card--${card.rarity.toLowerCase()}`}>
        <div className="trading-card-top">
          <div className="trading-badges">
            <span className="rarity-pill">
              <Award size={16} aria-hidden="true" />
              {card.rarity} Tier
            </span>
            {bossCleared && <span className="boss-medal-pill">Master Router Boss</span>}
            {maxCombo >= 2 && <span className="combo-pill">{maxCombo}x Max Streak</span>}
          </div>
          <span className="trading-card-score">{summary.total} / 1000 PTS</span>
        </div>

        <div className="trading-card-identity">
          <div className="persona-name">{definition.name}</div>
          <p className="trading-card-title">“{card.title}”</p>
        </div>

        <div className="trading-stats-grid" aria-label="Persona stat block">
          <div className="trading-stat">
            <span>Focus</span>
            <strong>{card.stats.focus}</strong>
          </div>
          <div className="trading-stat">
            <span>Creativity</span>
            <strong>{card.stats.creativity}</strong>
          </div>
          <div className="trading-stat">
            <span>Privacy</span>
            <strong>{card.stats.privacy}</strong>
          </div>
          <div className="trading-stat">
            <span>Battery Care</span>
            <strong>{card.stats.batteryCare}</strong>
          </div>
        </div>

        <ul className="priority-list">
          {definition.priorities.map((priority) => (
            <li key={priority}>{priority}</li>
          ))}
        </ul>
      </div>

      <div className="race-result">
        <div className="race-result-row">
          <span>Ghost Laptop (No NPU)</span>
          <div className="race-result-track">
            <span
              className="race-result-fill race-result-fill--left"
              style={{ width: `${race.leftProgress * 100}%` }}
            />
          </div>
        </div>
        <div className="race-result-row">
          <span>AI PC (With NPU)</span>
          <div className="race-result-track">
            <span
              className="race-result-fill race-result-fill--right"
              style={{ width: `${race.rightProgress * 100}%` }}
            />
          </div>
        </div>
        <p className="disclosure">{gameConfig.race.disclosure}</p>
      </div>
    </EndingFrame>
  )
}
