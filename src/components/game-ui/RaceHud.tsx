import { useEffect, useState } from 'react'
import { Flame, Volume2, VolumeX } from 'lucide-react'
import BrandMark from '../common/BrandMark'
import { gameConfig, getChallengeByIndex } from '../../game/config/loadConfig'
import { ENGINE_CHARACTERS } from '../../game/characters'
import { gameBus } from '../../game/events/bus'
import { isAudioMuted, setAudioMuted } from '../../services/audio/kioskAudio'
import { useGameStore } from '../../store/gameStore'

interface AnimatedPacket {
  id: string
  fellBack: boolean
}

export default function RaceHud({ onSkip }: { onSkip?: () => void }) {
  const phase = useGameStore((state) => state.phase)
  const currentChallenge = useGameStore((state) => state.currentChallenge)
  const remainingMs = useGameStore((state) => state.remainingMs)
  const race = useGameStore((state) => state.race)
  const combo = useGameStore((state) => state.combo ?? 0)
  const lastEngineMood = useGameStore((state) => state.lastEngineMood)
  const skipChallenge = useGameStore((state) => state.skipChallenge)
  const [muted, setMuted] = useState(isAudioMuted())
  const [packets, setPackets] = useState<AnimatedPacket[]>([])
  const [ghostFlash, setGhostFlash] = useState(false)

  useEffect(() => {
    const timers: number[] = []
    const unsubRouted = gameBus.on('packet:routed', (payload) => {
      const uid = `${payload.packetId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setPackets((prev) => [...prev.slice(-3), { id: uid, fellBack: payload.fellBack }])
      const t = window.setTimeout(() => {
        setPackets((prev) => prev.filter((item) => item.id !== uid))
      }, 900)
      timers.push(t)

      if (payload.fellBack) {
        setGhostFlash(true)
        const f = window.setTimeout(() => setGhostFlash(false), 650)
        timers.push(f)
      }
    })
    const unsubFallback = gameBus.on('packet:fallback', () => {
      setGhostFlash(true)
      const f = window.setTimeout(() => setGhostFlash(false), 650)
      timers.push(f)
    })
    return () => {
      unsubRouted()
      unsubFallback()
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

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

  const multiplier = combo >= 5 ? '3x' : combo >= 3 ? '2x' : combo >= 2 ? '1.5x' : null

  const title = challenge
        ? challenge.id === 'battery-escape'
          ? 'Deadline Day — boss battle'
          : challenge.title
    : phase === 'setup'
      ? 'Meet your 3 engines'
      : 'Race finish'

  const scenario = challenge
    ? challenge.id === 'battery-escape'
      ? 'Six tasks arrive on a live timer. Route 4+ right to unlock the Master Router boss reward!'
      : challenge.scenario
    : 'Your routing choices decide who wins.'

  return (
    <div className="race-hud">
      <header className="hud-header">
        <BrandMark />
        <div className="hud-copy">
          <span className="hud-kicker">
            {challenge ? `Challenge ${currentChallenge} / 5` : 'The routing race'}
          </span>
          <h1 className="hud-title">{title}</h1>
          <p className="hud-scenario">{scenario}</p>
        </div>
        <div className="hud-controls">
          {multiplier && (
            <span className="hud-combo-badge" aria-label={`Combo ${combo}`}>
              <Flame size={16} aria-hidden="true" />
              {combo} STREAK · {multiplier}
            </span>
          )}
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
          const mood = lastEngineMood?.[eng] ?? 'idle'
          return (
            <div key={eng} className={`hud-cast-pill hud-cast-pill--${mood}`}>
              <span className="hud-cast-avatar" aria-hidden="true">{char.avatars[mood]}</span>
              <strong>{eng}</strong>
              <span>{char.name}</span>
            </div>
          )
        })}
      </div>

      <div className="hud-lanes" aria-label="Race progress">
        <div className="hud-lane hud-lane--left">
          <span className="hud-lane-label">Without NPU routing</span>
          <div className={`hud-lane-track ${ghostFlash ? 'hud-lane-track--flash' : ''}`}>
            <div
              className="hud-lane-fill"
              style={{ width: `${race.leftProgress * 100}%` }}
            />
            {packets.map((pkt) => (
              <span
                key={`left-${pkt.id}`}
                className={`hud-packet-pill hud-packet-pill--left ${pkt.fellBack ? 'hud-packet-pill--bounce' : ''}`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <div className="hud-lane hud-lane--right">
          <span className="hud-lane-label">With NPU routing</span>
          <div className="hud-lane-track">
            <div
              className="hud-lane-fill"
              style={{ width: `${race.rightProgress * 100}%` }}
            />
            {packets.map((pkt) => (
              <span
                key={`right-${pkt.id}`}
                className={`hud-packet-pill hud-packet-pill--right ${pkt.fellBack ? 'hud-packet-pill--bounce' : ''}`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>

      <p className="hud-disclosure">{gameConfig.race.disclosure}</p>
    </div>
  )
}
