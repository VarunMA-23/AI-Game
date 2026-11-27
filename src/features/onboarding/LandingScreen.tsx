import { useState } from 'react'
import { ArrowUpRight, Clock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { recordSessionStart } from '../../services/storage/measurementStorage'
import { useGameStore } from '../../store/gameStore'
import { useIdleReset } from './useIdleReset'
import './landing.css'

function SparkleIcon({ color = '#65a30d', size = 14 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
    >
      <path d="M12 1L14.6 9.4L23 12L14.6 14.6L12 23L9.4 14.6L1 12L9.4 9.4L12 1Z" />
    </svg>
  )
}

function IntelLogo() {
  return (
    <span className="intel-wordmark" aria-label="Intel">
      <svg width="62" height="24" viewBox="0 0 62 24" fill="none" aria-hidden="true">
        <rect x="2.2" y="2.5" width="3.6" height="3.6" rx="0.6" fill="#00c7fd" />
        <rect x="2.2" y="8.2" width="3.6" height="12.8" rx="0.8" fill="#0068b5" />
        <path
          d="M9.6 8.2H13.1V10.1C13.9 8.7 15.4 7.9 17.3 7.9C20.4 7.9 22.3 9.9 22.3 13.3V21H18.7V13.9C18.7 12.1 17.7 11 16.1 11C14.3 11 13.2 12.2 13.2 14.1V21H9.6V8.2Z"
          fill="#0068b5"
        />
        <path
          d="M26.2 4.2H29.8V8.2H32.6V11.2H29.8V16.6C29.8 17.7 30.3 18.2 31.4 18.2H32.6V21.1C31.9 21.3 31.1 21.3 30.4 21.3C27.6 21.3 26.2 19.9 26.2 17V11.2H24.1V8.2H26.2V4.2Z"
          fill="#0068b5"
        />
        <path
          d="M40.3 21.4C36.4 21.4 33.7 18.7 33.7 14.6C33.7 10.6 36.4 7.9 40.2 7.9C44.2 7.9 46.6 10.7 46.6 14.9V15.7H37.3C37.6 17.5 38.8 18.5 40.5 18.5C41.9 18.5 42.9 17.9 43.5 17L46.1 18.7C44.9 20.4 42.9 21.4 40.3 21.4ZM37.4 13.2H43C42.8 11.6 41.7 10.6 40.2 10.6C38.7 10.6 37.7 11.6 37.4 13.2Z"
          fill="#0068b5"
        />
        <rect x="49.2" y="2.8" width="3.6" height="18.2" rx="0.8" fill="#0068b5" />
      </svg>
    </span>
  )
}

function LaptopHeroVisual() {
  return (
    <div className="laptop-showcase">
      <div className="laptop-glow" aria-hidden="true" />

      <div className="float-pill float-pill--glass float-pill--top-right" aria-hidden="true">
        <SparkleIcon color="#6366f1" size={12} />
        <span>Ideas, meet possibility.</span>
      </div>

      <div className="float-pill float-pill--glass float-pill--bottom-left" aria-hidden="true">
        <span className="nav-lime-dot" />
        <span>Powered by your potential.</span>
      </div>

      <div className="float-pill float-pill--lime" aria-hidden="true">
        LESS ORDINARY. MORE YOU.
      </div>

      <div className="laptop-svg-wrap">
        <svg viewBox="0 0 540 390" fill="none" role="img" aria-label="Intel Core Ultra AI PC laptop illustration">
          <defs>
            <linearGradient id="screenBg" x1="80" y1="30" x2="430" y2="270" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#312e81" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <radialGradient id="screenRadial" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bezelGrad" x1="65" y1="22" x2="435" y2="275" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="deckGrad" x1="40" y1="265" x2="495" y2="345" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="55%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="chipBorder" x1="205" y1="92" x2="305" y2="192" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c8ff3d" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
          </defs>

          {/* Outer lid / bezel (silver aluminum) */}
          <path
            d="M72 44C72 34.0589 79.8 25.7 89.7 25.1L407.7 10.1C418.4 9.6 427.5 18.1 427.5 28.8V248C427.5 256.8 420.4 264 411.5 264H88C79.1634 264 72 256.837 72 248V44Z"
            fill="url(#bezelGrad)"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {/* Inner screen */}
          <path
            d="M84 48C84 41.3 89.2 35.8 95.9 35.4L402.9 21.4C409.9 21.1 415.8 26.7 415.8 33.7V240C415.8 245.5 411.3 250 405.8 250H94C88.4772 250 84 245.523 84 240V48Z"
            fill="url(#screenBg)"
          />
          <path
            d="M84 48C84 41.3 89.2 35.8 95.9 35.4L402.9 21.4C409.9 21.1 415.8 26.7 415.8 33.7V240C415.8 245.5 411.3 250 405.8 250H94C88.4772 250 84 245.523 84 240V48Z"
            fill="url(#screenRadial)"
          />

          {/* Radiating circuit / light lines */}
          <g stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1">
            <line x1="250" y1="88" x2="250" y2="28" />
            <line x1="228" y1="88" x2="220" y2="30" />
            <line x1="272" y1="88" x2="280" y2="30" />
            <line x1="206" y1="90" x2="180" y2="34" />
            <line x1="294" y1="90" x2="320" y2="34" />
            <line x1="250" y1="194" x2="250" y2="248" />
            <line x1="226" y1="194" x2="190" y2="248" />
            <line x1="274" y1="194" x2="310" y2="248" />
            <line x1="204" y1="186" x2="132" y2="248" />
            <line x1="296" y1="186" x2="368" y2="248" />
            <line x1="196" y1="142" x2="96" y2="146" />
            <line x1="304" y1="142" x2="404" y2="138" />
          </g>

          {/* Intel Core Ultra chip badge on screen */}
          <g className="chip-pulse" transform="rotate(-2 250 140)">
            <rect
              x="198"
              y="88"
              width="104"
              height="104"
              rx="18"
              fill="#1e1b4b"
              stroke="url(#chipBorder)"
              strokeWidth="2.5"
            />
            <rect
              x="204"
              y="94"
              width="92"
              height="92"
              rx="13"
              fill="#2e1065"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1"
            />
            <text
              x="217"
              y="125"
              fill="#ffffff"
              fontFamily="Space Grotesk, Inter, sans-serif"
              fontSize="18"
              fontWeight="700"
              letterSpacing="-0.5"
            >
              intel
            </text>
            <text
              x="217"
              y="147"
              fill="#e0e7ff"
              fontFamily="Space Grotesk, Inter, sans-serif"
              fontSize="14"
              fontWeight="700"
              letterSpacing="1.2"
            >
              CORE
            </text>
            <text
              x="217"
              y="167"
              fill="#c8ff3d"
              fontFamily="Space Grotesk, Inter, sans-serif"
              fontSize="14"
              fontWeight="600"
              letterSpacing="1.6"
            >
              ULTRA
            </text>
          </g>

          {/* Laptop lower deck / keyboard */}
          <path
            d="M84 256H420L486 308C493 313.5 489.2 325 480.2 325H44.5C35.2 325 31.6 312.8 39.2 307.5L84 256Z"
            fill="url(#deckGrad)"
            stroke="#94a3b8"
            strokeWidth="1.2"
          />

          {/* Bottom front lip */}
          <path
            d="M36 318C36 318 42 332 54 332H474C484 332 490 318 490 318H36Z"
            fill="#94a3b8"
          />

          {/* Keyboard well */}
          <path
            d="M96 263H408L445 294H66L96 263Z"
            fill="#cbd5e1"
            opacity="0.9"
          />

          {/* Key rows */}
          <g fill="#475569" opacity="0.85">
            <rect x="98" y="267" width="302" height="4.5" rx="1.5" />
            <rect x="91" y="274" width="318" height="4.5" rx="1.5" />
            <rect x="83" y="281" width="335" height="4.5" rx="1.5" />
            <rect x="75" y="288" width="351" height="4.5" rx="1.5" />
          </g>

          {/* Trackpad */}
          <path
            d="M210 299H298L308 314H202L210 299Z"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  )
}

export default function LandingScreen() {
  const navigate = useNavigate()
  const startSession = useGameStore((state) => state.startSession)
  const [whyOpen, setWhyOpen] = useState(false)

  useIdleReset(60000)

  const handleStart = () => {
    startSession()
    recordSessionStart()
    navigate('/setup')
  }

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-left">
          <IntelLogo />
          <span className="nav-divider" aria-hidden="true" />
          <span className="nav-campaign">
            <span>1 MILLION</span>
            <span>MINDS</span>
          </span>
        </div>

        <div className="landing-nav-center">
          <span className="nav-lime-dot" aria-hidden="true" />
          <span>REAL POSSIBILITIES. REAL YOU.</span>
        </div>

        <div className="landing-nav-right">
          <button
            type="button"
            className="nav-outline-btn"
            onClick={() => setWhyOpen(true)}
          >
            <span>Why an AI PC?</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="hero-left">
          <div className="hero-eyebrow-pill">
            <SparkleIcon color="#65a30d" size={12} />
            <span>YOUR NEXT LEVEL STARTS HERE</span>
          </div>

          <h1 id="landing-title" className="hero-headline">
            Big main
            <br />
            character <em className="hero-headline-energy">energy.</em>
            <br />
            Now in a PC.
          </h1>

          <p className="hero-description">
            Your ideas don&apos;t do basic. Your laptop shouldn&apos;t either.
            <br />
            Play your way to an Intel® AI PC that gets you.
          </p>

          <div className="hero-cta-wrap">
            <button type="button" className="hero-cta-btn" onClick={handleStart}>
              <span>Find my AI energy</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="hero-meta-row">
            <span className="hero-meta-item">
              <Clock size={14} aria-hidden="true" />
              <span>2–3 min</span>
            </span>
            <span className="hero-meta-sep" aria-hidden="true">•</span>
            <span>No tech knowledge needed</span>
            <span className="hero-meta-sep" aria-hidden="true">•</span>
            <span>100% you</span>
          </div>
        </div>

        <div className="hero-right">
          <LaptopHeroVisual />
          <p className="showcase-caption">
            <SparkleIcon color="#6366f1" size={14} />
            <span>
              Not just artificial intelligence.{' '}
              <strong>Your intelligence, amplified.</strong>
            </span>
          </p>
        </div>
      </section>

      {whyOpen && (
        <div
          className="why-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="why-modal-title"
          onClick={() => setWhyOpen(false)}
        >
          <div className="why-modal" onClick={(e) => e.stopPropagation()}>
            <div className="why-modal-header">
              <h2 id="why-modal-title" className="why-modal-title">
                Why an Intel® Core™ Ultra AI PC?
              </h2>
              <button
                type="button"
                className="why-modal-close"
                aria-label="Close"
                onClick={() => setWhyOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <ul className="why-modal-list">
              <li className="why-modal-item">
                <strong>Dedicated NPU Routing</strong>
                <span>
                  Offloads sustained AI tasks from the CPU and GPU so everyday creativity stays smooth and responsive.
                </span>
              </li>
              <li className="why-modal-item">
                <strong>Built for On-Device Privacy</strong>
                <span>
                  Run AI effects, summaries, and studio tools locally on your PC without sending every prompt to the cloud.
                </span>
              </li>
              <li className="why-modal-item">
                <strong>Unplugged Efficiency</strong>
                <span>
                  Smart workload distribution keeps fans quiet and power draw low when you are working away from a charger.
                </span>
              </li>
            </ul>

            <button
              type="button"
              className="hero-cta-btn"
              style={{ width: '100%' }}
              onClick={() => {
                setWhyOpen(false)
                handleStart()
              }}
            >
              <span>Find my AI energy</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
