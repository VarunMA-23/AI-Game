import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import BrandMark from '../common/BrandMark'
import { gameConfig, getChallengeByIndex } from '../../game/config/loadConfig'
import { ENGINE_CHARACTERS } from '../../game/characters'
import { gameBus } from '../../game/events/bus'
import { isAudioMuted, setAudioMuted } from '../../services/audio/kioskAudio'
import { useGameStore } from '../../store/gameStore'

export default function RaceHud({ onSkip }: { onSkip?: () => void }) {
  const phase = useGameStore((state) => state.phase)
  const currentChallenge = useGameStore((state) => state.currentChallenge)
  const remainingMs = useGameStore((state) => state.remainingMs)
  const race = useGameStore((state) => state.race)
  const skipChallenge = useGameStore((state) => state.skipChallenge)
  const [muted, setMuted] = useState(isAudioMuted())

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

  const toggleAudio = () => {
    const next = !muted
    setAudioMuted(next)
    setMuted(next)
  }

  const title = challenge
    ? challenge.id === 'battery-escape'
      ? 'DEADLINE DAY — BOSS BATTLE'
      : challenge.title.toUpperCase()
    : phase === 'setup'
      ? 'MEET YOUR 3 ENGINES'
      : 'RACE FINISH'

  const scenario = challenge
    ? challenge.id === 'battery-escape'
      ? 'Six tasks arrive on a live timer. Route each one before the day runs out!'
      : challenge.scenario
    : 'Your routing choices decide who wins.'

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
          <button
            type="button"
            className="hud-sound-btn"
            onClick={toggleAudio}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            title={muted ? 'Unmute sound' : 'Mute sound'}
          >
            {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
          </button>
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

      <div className="hud-cast" aria-label="Engine characters">
        {(['CPU', 'GPU', 'NPU'] as const).map((eng) => {
          const char = ENGINE_CHARACTERS[eng]
          return (
            <div key={eng} className={`hud-cast-pill hud-cast-pill--${eng.toLowerCase()}`}>
              <strong>{eng}</strong>
              <span>{char.name}</span>
            </div>
          )
        })}
      </div>

      <div className="hud-lanes" aria-label="Race progress">
        <div className="hud-lane hud-lane--left">
          <span className="hud-lane-label">GHOST LAPTOP (NO NPU)</span>
          <div className="hud-lane-track">
            <div
              className="hud-lane-fill"
              style={{ width: `${race.leftProgress * 100}%` }}
            />
          </div>
        </div>
        <div className="hud-lane hud-lane--right">
          <span className="hud-lane-label">AI PC (WITH NPU)</span>
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
