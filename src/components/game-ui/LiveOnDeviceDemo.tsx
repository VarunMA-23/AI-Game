import { useEffect, useRef, useState } from 'react'
import { Cpu, WifiOff } from 'lucide-react'

const SAMPLE_CONTRACT =
  'Section 1: Confidential pilot terms remain strictly internal to the buyer and vendor. ' +
  'Section 2: On-device AI processing ensures zero document text is transmitted to external cloud servers. ' +
  'Section 3: Warranty covers 24 months of hardware support and battery diagnostics. ' +
  'Section 4: Final pricing is locked at store checkout with verified in-stock serial numbers.'

function summarizeLocally(text: string): { summary: string[]; ms: number } {
  const start = performance.now()
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const keywords = ['confidential', 'on-device', 'zero', 'warranty', 'pricing']
  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase()
    const hits = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
    return { sentence, hits }
  })
  scored.sort((a, b) => b.hits - a.hits)
  const ms = Math.max(0.2, Math.round((performance.now() - start) * 10) / 10)
  return { summary: scored.slice(0, 2).map((s) => s.sentence), ms }
}

export default function LiveOnDeviceDemo() {
  const [mode, setMode] = useState<'blur' | 'summary'>('blur')
  const [blurOn, setBlurOn] = useState(true)
  const [blurMs, setBlurMs] = useState(0)
  const [summaryResult, setSummaryResult] = useState<{ summary: string[]; ms: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (mode !== 'blur' || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const start = performance.now()
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Background office scene
    ctx.save()
    if (blurOn) {
      ctx.filter = 'blur(6px)'
    }
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(16, 18, 64, 84)
    ctx.fillStyle = '#cbd5e1'
    ctx.fillRect(190, 24, 72, 70)
    ctx.fillStyle = '#64748b'
    ctx.fillRect(96, 14, 78, 44)
    ctx.restore()

    // Crisp foreground subject
    ctx.fillStyle = '#0068b5'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 - 12, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(w / 2 - 34, h / 2 + 16, 68, 44, 16)
    ctx.fill()

    setBlurMs(Math.max(0.3, Math.round((performance.now() - start) * 10) / 10))
  }, [mode, blurOn])

  return (
    <div className="live-proof-box">
      <div className="live-proof-head">
        <span className="live-proof-badge">
          <WifiOff size={14} aria-hidden="true" />
          OFFLINE — Running 100% on this machine
        </span>
        <div className="live-proof-tabs">
          <button
            type="button"
            className={`live-proof-tab ${mode === 'blur' ? 'live-proof-tab--active' : ''}`}
            onClick={() => setMode('blur')}
          >
            Local Portrait Blur
          </button>
          <button
            type="button"
            className={`live-proof-tab ${mode === 'summary' ? 'live-proof-tab--active' : ''}`}
            onClick={() => {
              setMode('summary')
              setSummaryResult(summarizeLocally(SAMPLE_CONTRACT))
            }}
          >
            Local Note Summary
          </button>
        </div>
      </div>

      {mode === 'blur' ? (
        <div className="live-proof-content">
          <canvas
            ref={canvasRef}
            width={280}
            height={130}
            className="live-proof-canvas"
            aria-label="Local portrait background blur preview"
          />
          <div className="live-proof-meta">
            <p>
              <strong>Zero network calls.</strong> Background blur is computed locally on your browser canvas in{' '}
              <strong>{blurMs} ms</strong>.
            </p>
            <button
              type="button"
              className="small-button"
              onClick={() => setBlurOn((v) => !v)}
            >
              <Cpu size={16} aria-hidden="true" />
              {blurOn ? 'Disable Local Blur' : 'Enable Local Blur'}
            </button>
          </div>
        </div>
      ) : (
        <div className="live-proof-summary">
          <p className="live-proof-source">
            <strong>Local summary ({summaryResult?.ms ?? 0.4} ms, 0 bytes sent):</strong>
          </p>
          <ul>
            {(summaryResult?.summary ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

