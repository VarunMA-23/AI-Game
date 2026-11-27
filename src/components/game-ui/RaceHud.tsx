import BrandMark from '../common/BrandMark'
import { gameConfig, getChallengeByIndex } from '../../game/config/loadConfig'
import { gameBus } from '../../game/events/bus'
import { useGameStore } from '../../store/gameStore'

export default function RaceHud({ onSkip }: { onSkip?: () => void }) {
  const phase = useGameStore((state) => state.phase)
  const currentChallenge = useGameStore((state) => state.currentChallenge)
  const remainingMs = useGameStore((state) => state.remainingMs)
  const race = useGameStore((state) => state.race)
  const skipChallenge = useGameStore((state) => state.skipChallenge)

  const challenge = getChallengeByIndex(currentChallenge)
  const inChallenge = phase === 'challenges' && Boolean(challenge)

  const handleSkip = () => {
    if (!challenge) {
      return
    }
    skipChallenge(challenge.id)
    gameBus.emit('challenge:skip', { challengeId: challenge.id })
    onSkip?.()
  }

  const title = challenge
    ? challenge.title.toUpperCase()
    : phase === 'setup'
      ? 'RACE SETUP'
      : 'RACE FINISH'
  const scenario = challenge
    ? challenge.scenario
    : 'Your choices decide who wins.'

  return (
    <div className="race-hud">
      <header className="hud-header">
        <BrandMark />
        <div className="hud-copy">
          <span className="hud-kicker">
            {challenge ? `CHALLENGE ${currentChallenge} / 5` : 'THE ROUTING RACE'}
          </span>
          <h1 className="hud-title">{title}</h1>
          <p className="hud-scenario">{scenario}</p>
        </div>
        <div className="hud-controls">
          <span className="hud-timer" aria-label="Seconds remaining">
            {inChallenge ? Math.ceil(remainingMs / 1000) : '—'}
            <small>SEC</small>
          </span>
          {inChallenge && (
            <button type="button" className="hud-skip" onClick={handleSkip}>
              SKIP
            </button>
          )}
        </div>
      </header>

      <div className="hud-lanes" aria-label="Race progress">
        <div className="hud-lane hud-lane--left">
          <span className="hud-lane-label">WITHOUT NPU ROUTING</span>
          <div className="hud-lane-track">
            <div
              className="hud-lane-fill"
              style={{ width: `${race.leftProgress * 100}%` }}
            />
          </div>
        </div>
        <div className="hud-lane hud-lane--right">
          <span className="hud-lane-label">WITH NPU ROUTING</span>
          <div className="hud-lane-track">
            <div
              className="hud-lane-fill"
              style={{ width: `${race.rightProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      <p className="hud-disclosure">{gameConfig.race.disclosure}</p>
    </div>
  )
}
