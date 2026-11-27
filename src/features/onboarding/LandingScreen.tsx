import { ArrowRight, Cpu, Timer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandMark from '../../components/common/BrandMark'
import { recordSessionStart } from '../../services/storage/measurementStorage'
import { useGameStore } from '../../store/gameStore'
import { useIdleReset } from './useIdleReset'

const packetDelays = ['0s', '1.15s', '2.3s']

interface LaneProps {
  variant: 'left' | 'right'
  name: string
  tag: string
  caption: string
}

function Lane({ variant, name, tag, caption }: LaneProps) {
  return (
    <section className={`lane-card lane-card--${variant}`} aria-label={name}>
      <div className="lane-header">
        <span className="lane-name">
          <Cpu size={18} aria-hidden="true" />
          {name}
        </span>
        <span className="lane-tag">{tag}</span>
      </div>

      <div className="laptop" aria-hidden="true">
        <div className="laptop-screen">
          <div className="track" />
          <div className="finish-line" />
          {packetDelays.map((delay) => (
            <span
              key={delay}
              className="packet packet--animated"
              style={{ animationDelay: delay }}
              aria-hidden="true"
            />
          ))}
          <div className="engine-row">
            <span className="engine">
              <span className="engine-dot" />
              CPU
            </span>
            <span className="engine">
              <span className="engine-dot" />
              GPU
            </span>
            <span className="engine">
              <span className="engine-dot" />
              NPU
            </span>
          </div>
        </div>
        <div className="laptop-base" />
      </div>

      <p className="lane-caption">{caption}</p>
    </section>
  )
}

export default function LandingScreen() {
  const navigate = useNavigate()
  const startSession = useGameStore((state) => state.startSession)

  useIdleReset(60000)

  const handleStart = () => {
    startSession()
    recordSessionStart()
    navigate('/setup')
  }

  return (
    <main className="landing">
      <header className="landing-header">
        <BrandMark />
        <span className="session-badge">
          <span className="session-badge-dot" aria-hidden="true" />
          Demo ready
        </span>
      </header>

      <div className="landing-main">
        <section className="hero-copy" aria-labelledby="landing-title">
          <div className="eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            AI PC Showdown
            <span className="eyebrow-line" aria-hidden="true" />
          </div>

          <h1 id="landing-title" className="hero-title">
            YOUR NEXT LAPTOP
            <br />
            <em>NEEDS AN UPGRADE.</em>
          </h1>

          <p className="hero-subtitle">
            5 interactive challenges. One smarter choice.
          </p>

          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={handleStart}>
              START DEMO
              <ArrowRight size={24} aria-hidden="true" />
            </button>
          </div>
        </section>

        <div className="race-stage">
          <Lane
            variant="left"
            name="Without NPU routing"
            tag="Every task on CPU or GPU"
            caption="Same tasks. One lane stays on general-purpose engines."
          />
          <Lane
            variant="right"
            name="With NPU routing"
            tag="Supported tasks use the NPU"
            caption="Same tasks. This lane routes each packet where it fits."
          />
        </div>
      </div>

      <footer className="landing-footer">
        <span className="footer-item">
          <Cpu size={17} aria-hidden="true" />
          Click or tap to play
        </span>
        <span className="footer-item">
          <Timer size={17} aria-hidden="true" />
          25s per challenge
        </span>
        <span className="footer-item">
          <ArrowRight size={17} aria-hidden="true" />
          No sign-in
        </span>
      </footer>
    </main>
  )
}
