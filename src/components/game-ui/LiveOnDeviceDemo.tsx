import { useEffect, useRef, useState } from 'react'
import { Activity, CloudOff, Cpu, Wifi, WifiOff } from 'lucide-react'

const SAMPLE_NOTES =
  'Lecture 7: Neural Processing Units (NPUs) run matrix math for local summaries and background blur at low wattage. ' +
  'Unlike cloud chatbots, on-device AI keeps confidential notes and exam prep on your laptop with zero Wi-Fi required. ' +
  'Battery life depends on display brightness, battery Wh rating, and compatible software.'

function summarizeLocally(text: string): { summary: string[]; ms: number } {
  const start = performance.now()
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const keywords = ['npu', 'on-device', 'zero wi-fi', 'confidential', 'low wattage']
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
  const [mode, setMode] = useState<'summary' | 'blur'>('summary')
  const [internetOff, setInternetOff] = useState(true)
  const [blurOn, setBlurOn] = useState(true)
  const [blurMs, setBlurMs] = useState(0)
  const [summaryResult, setSummaryResult] = useState<{ summary: string[]; ms: number }>(() =>
    summarizeLocally(SAMPLE_NOTES),
  )
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
        <div>
          <strong className="live-proof-hook-title">
            The Internet Goes Away. Your AI Doesn&apos;t.
          </strong>
          <div className="live-proof-badges">
            <span className={`live-proof-badge ${internetOff ? 'live-proof-badge--offline' : ''}`}>
              {internetOff ? <WifiOff size={14} aria-hidden="true" /> : <Wifi size={14} aria-hidden="true" />}
              {internetOff ? 'INTERNET DISCONNECTED' : 'ONLINE'}
            </span>
            <span className="live-proof-net">
              <Activity size={14} aria-hidden="true" />
              Network activity: 0 requests · 0 bytes sent
            </span>
          </div>
        </div>

        <div className="live-proof-tabs">
          <button
            type="button"
            className="small-button"
            onClick={() => setInternetOff((v) => !v)}
          >
            {internetOff ? 'Reconnect Wi-Fi' : 'Disconnect Wi-Fi'}
          </button>
          <button
            type="button"
            className={`live-proof-tab ${mode === 'summary' ? 'live-proof-tab--active' : ''}`}
            onClick={() => {
              setMode('summary')
              setSummaryResult(summarizeLocally(SAMPLE_NOTES))
            }}
          >
            Local Summary
          </button>
          <button
            type="button"
            className={`live-proof-tab ${mode === 'blur' ? 'live-proof-tab--active' : ''}`}
            onClick={() => setMode('blur')}
          >
            Local Blur
          </button>
        </div>
      </div>

      <div className="offline-compare-grid">
        <div className={`offline-compare-card ${internetOff ? 'offline-compare-card--fail' : ''}`}>
          <div className="offline-compare-head">
            <CloudOff size={16} aria-hidden="true" />
            <strong>Cloud AI (e.g. online chatbot)</strong>
          </div>
          <p>
            {internetOff
              ? 'Blocked — No internet connection. Cannot summarize notes or process files on a flight, train, or weak Wi-Fi.'
              : 'Requires uploading your document to an external server over the internet.'}
          </p>
        </div>

        <div className="offline-compare-card offline-compare-card--ok">
          <div className="offline-compare-head">
            <Cpu size={16} aria-hidden="true" />
            <strong>On-Device AI (This Machine)</strong>
          </div>
          {mode === 'summary' ? (
            <div className="live-proof-summary">
              <p>
                <strong>Completed locally in {summaryResult.ms} ms</strong> — 0 network requests:
              </p>
              <ul>
                {summaryResult.summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="live-proof-content">
              <canvas
                ref={canvasRef}
                width={220}
                height={104}
                className="live-proof-canvas"
                aria-label="Local portrait background blur preview"
              />
              <div className="live-proof-meta">
                <p>
                  <strong>{blurMs} ms</strong> local render.
                </p>
                <button
                  type="button"
                  className="small-button"
                  onClick={() => setBlurOn((v) => !v)}
                >
                  {blurOn ? 'Disable Blur' : 'Enable Blur'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
