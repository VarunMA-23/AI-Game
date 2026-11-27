let audioCtx: AudioContext | null = null
let muted = false

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined' || muted) {
    return null
  }
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) {
    return null
  }
  if (!audioCtx) {
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

const playTone = (
  freq: number,
  durationSec: number,
  type: OscillatorType,
  gainPeak: number,
  delaySec = 0,
): void => {
  const ctx = getContext()
  if (!ctx) return

  const start = ctx.currentTime + delaySec
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, start)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(start)
  osc.stop(start + durationSec + 0.02)
}

export const isAudioMuted = (): boolean => muted

export const setAudioMuted = (next: boolean): void => {
  muted = next
}

export const playGoodChime = (): void => {
  playTone(587.33, 0.14, 'sine', 0.08, 0)
  playTone(880, 0.22, 'sine', 0.08, 0.08)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(18)
  }
}

export const playWarnHum = (): void => {
  playTone(175, 0.22, 'triangle', 0.09, 0)
  playTone(146.83, 0.26, 'triangle', 0.07, 0.1)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([25, 30, 25])
  }
}

export const playCompleteChord = (): void => {
  playTone(523.25, 0.22, 'sine', 0.07, 0)
  playTone(659.25, 0.24, 'sine', 0.07, 0.07)
  playTone(783.99, 0.3, 'sine', 0.08, 0.14)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(30)
  }
}

