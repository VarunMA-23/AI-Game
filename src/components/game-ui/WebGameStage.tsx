import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  Cpu,
  Fan,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  UploadCloud,
} from 'lucide-react'
import { allPackets, gameConfig, getChallenge, getChallengeByIndex } from '../../game/config/loadConfig'
import { ENGINE_CHARACTERS, getCharacterVoiceLine } from '../../game/characters'
import { gameBus } from '../../game/events/bus'
import { computeRaceProgress, resolveRoute, routeIsCorrect } from '../../game/race/routing'
import { scoreBatteryEscape } from '../../game/scoring/batteryEscape'
import type { BatteryEscapeChoice } from '../../game/scoring/batteryEscape'
import { scoreCreatorMode } from '../../game/scoring/creatorMode'
import type { PacketChoice } from '../../game/scoring/creatorMode'
import { scorePrivacyShield } from '../../game/scoring/privacyShield'
import type { ProcessingChoice } from '../../game/scoring/privacyShield'
import { scoreStreamNight } from '../../game/scoring/streamNight'
import type { StreamNightChoice } from '../../game/scoring/streamNight'
import { scoreStudySprint } from '../../game/scoring/studySprint'
import {
  playCompleteChord,
  playGoodChime,
  playTaskArrivalTick,
  playWarnHum,
} from '../../services/audio/kioskAudio'
import { listDailyLeaderboard, recordLeaderboardScore } from '../../services/storage/leaderboardStorage'
import { useGameStore } from '../../store/gameStore'
import type { ChallengeDefinition, ChallengeId, Engine, PacketRoute } from '../../types/game'
import LiveOnDeviceDemo from './LiveOnDeviceDemo'

const ENGINES: Engine[] = ['CPU', 'GPU', 'NPU']

interface ChallengeProps {
  challenge: ChallengeDefinition
  elapsedMs: () => number
  onRoute: (packetId: string, engine: Engine) => { engine: Engine; fellBack: boolean; isGood: boolean }
  onProgress: (score: number) => void
  onComplete: (score: number, subscores?: Record<string, number>) => void
  onFeedback: (text: string, tone?: 'neutral' | 'success' | 'warn') => void
}

function EngineButtons({
  disabled,
  selected,
  onSelect,
}: {
  disabled?: boolean
  selected?: Engine | null
  onSelect: (engine: Engine) => void
}) {
  return (
    <div className="web-engine-grid">
      {ENGINES.map((engine) => {
        const char = ENGINE_CHARACTERS[engine]
        return (
          <button
            key={engine}
            type="button"
            disabled={disabled}
            className={`web-engine-btn ${selected === engine ? 'web-engine-btn--active' : ''}`}
            onClick={() => onSelect(engine)}
          >
            <span className="web-engine-name">{char.name}</span>
            <span className="web-engine-hint">
              {engine} · {char.role}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function GhostLaptopPanel({
  routedCount,
  fallbacks,
  combo,
}: {
  routedCount: number
  fallbacks: number
  combo: number
}) {
  const fanLevel = routedCount === 0 ? 'Quiet' : routedCount < 3 ? 'Warming up' : 'Loud (Max RPM)'
  const ghostBattery = Math.max(18, 100 - routedCount * 14 - fallbacks * 6)
  const queued = Math.max(0, routedCount - 1)
  const stalled = combo >= 3

  return (
    <aside className="ghost-laptop-panel" aria-label="Illustrative Ghost Laptop comparison">
      <div className="ghost-laptop-head">
        <span className="ghost-badge">ILLUSTRATION · NO NPU</span>
        <strong>Standard Ghost Laptop</strong>
      </div>
      {stalled && (
        <div className="ghost-stall-toast" role="status">
          ⚡ Ghost Laptop just stalled on queued tasks!
        </div>
      )}
      <div className="ghost-stat">
        <span><Fan size={14} aria-hidden="true" /> Fan noise</span>
        <strong className={routedCount >= 3 ? 'web-tone-warn' : ''}>{fanLevel}</strong>
      </div>
      <div className="ghost-stat">
        <span>Battery headroom (64–76 Wh)</span>
        <strong className={ghostBattery < 50 ? 'web-tone-warn' : ''}>{ghostBattery}%</strong>
      </div>
      <div className="web-meter-track">
        <div
          className={`web-meter-fill ${ghostBattery >= 60 ? 'web-meter-fill--info' : 'web-meter-fill--warn'}`}
          style={{ width: `${ghostBattery}%` }}
        />
      </div>
      <div className="ghost-stat">
        <span>Queued on CPU/GPU</span>
        <strong>{queued} task{queued === 1 ? '' : 's'} waiting</strong>
      </div>
      <div className="ghost-cited-specs">
        <div>
          <strong>AI PC NPU:</strong> 11–47 TOPS <span>(Source: Intel Core Ultra Spec)</span>
        </div>
        <div>
          <strong>Base TDP:</strong> 17W–28W <span>(Source: Intel Ark 125H / 258V)</span>
        </div>
      </div>
      <p className="ghost-note">
        Secondary note: queue &amp; fan states are illustrative; NPU TOPS, Wh, and TDP are published specs.
      </p>
    </aside>
  )
}

function StudySprintView({
  challenge,
  elapsedMs,
  onRoute,
  onProgress,
  onComplete,
  onFeedback,
}: ChallengeProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [routedEngine, setRoutedEngine] = useState<Engine | null>(null)
  const concepts = challenge.concepts ?? []

  const toggleConcept = (id: string) => {
    if (routedEngine) return
    const next = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : selectedIds.length < 5
        ? [...selectedIds, id]
        : selectedIds

    setSelectedIds(next)
    const picked = concepts.filter((c) => next.includes(c.id))
    const correct = picked.filter((c) => c.correct).length
    const incorrect = picked.length - correct
    const score = scoreStudySprint(
      {
        correct,
        incorrect,
        elapsedMs: elapsedMs(),
        completed: next.length === 5,
      },
      gameConfig.scoring,
    )
    onProgress(score)
    if (next.length === 5) {
      onFeedback('Summary ready! Choose which character should run it.', 'success')
    } else {
      onFeedback(`Selected ${next.length} of 5 concepts.`)
    }
  }

  const handleEngine = (engine: Engine) => {
    if (selectedIds.length !== 5 || routedEngine) return
    const picked = concepts.filter((c) => selectedIds.includes(c.id))
    const correct = picked.filter((c) => c.correct).length
    const incorrect = picked.length - correct
    const score = scoreStudySprint(
      {
        correct,
        incorrect,
        elapsedMs: elapsedMs(),
        completed: true,
      },
      gameConfig.scoring,
    )
    const outcome = onRoute('notes-summary', engine)
    setRoutedEngine(engine)
    onFeedback(
      getCharacterVoiceLine(engine, outcome.isGood),
      outcome.isGood ? 'success' : 'warn',
    )
    onComplete(score)
  }

  return (
    <div className="web-challenge-body">
      <div className="web-section-head">
        <span className="web-step-pill">Step 1: Pick 5 key study concepts ({selectedIds.length}/5)</span>
        <span className="web-demo-tag">Demo content — precomputed summary</span>
      </div>

      <div className="web-chip-grid">
        {concepts.map((concept) => {
          const active = selectedIds.includes(concept.id)
          return (
            <button
              key={concept.id}
              type="button"
              disabled={Boolean(routedEngine)}
              className={`web-chip ${active ? 'web-chip--active' : ''}`}
              onClick={() => toggleConcept(concept.id)}
            >
              {active && <Check size={16} aria-hidden="true" />}
              <span>{concept.label}</span>
            </button>
          )
        })}
      </div>

      <div className={`web-route-box ${selectedIds.length === 5 ? 'web-route-box--ready' : ''}`}>
        <p className="web-route-prompt">
          {selectedIds.length === 5
            ? 'Step 2: Route the Notes Summary packet to an engine'
            : `Select ${5 - selectedIds.length} more concept${5 - selectedIds.length === 1 ? '' : 's'} to unlock routing`}
        </p>
        <EngineButtons
          disabled={selectedIds.length !== 5 || Boolean(routedEngine)}
          selected={routedEngine}
          onSelect={handleEngine}
        />
      </div>
    </div>
  )
}

const CREATOR_IMAGES: Record<string, string> = {
  before: 'images/creator-before.svg',
  'background-removal': 'images/creator-removed.svg',
  enhance: 'images/creator-enhanced.svg',
  'style-filter': 'images/creator-styled.svg',
}

function CreatorModeView({
  challenge,
  elapsedMs,
  onRoute,
  onProgress,
  onComplete,
  onFeedback,
}: ChallengeProps) {
  const [sequence, setSequence] = useState<string[]>([])
  const [choices, setChoices] = useState<Record<string, PacketChoice>>({})
  const [pendingPacketId, setPendingPacketId] = useState<string | null>(null)
  const [activeImageKey, setActiveImageKey] = useState<string>('before')
  const resetChallengeRoutes = useGameStore((s) => s.resetChallengeRoutes)
  const tools = challenge.tools ?? []

  const recompute = (nextSeq: string[], nextChoices: Record<string, PacketChoice>) => {
    const result = scoreCreatorMode(
      {
        sequence: nextSeq,
        routes: nextChoices,
        elapsedMs: elapsedMs(),
      },
      challenge.packets,
      gameConfig.scoring,
    )
    onProgress(result.score)
    if (
      result.correctSteps === 3 &&
      Object.keys(nextChoices).length === challenge.packets.length
    ) {
      onComplete(result.score)
    }
  }

  const handleToolTap = (toolId: string) => {
    if (pendingPacketId) {
      onFeedback('Route the current effect to an engine first.', 'warn')
      return
    }
    const nextSeq = [...sequence, toolId]
    const expected = tools[nextSeq.length - 1]?.id
    setSequence(nextSeq)

    if (toolId !== expected) {
      playWarnHum()
      onFeedback('That tool is out of order. Click Reset to try again.', 'warn')
      recompute(nextSeq, choices)
      return
    }

    setActiveImageKey(toolId)
    const packetId = toolId === 'enhance' ? null : toolId
    if (packetId) {
      setPendingPacketId(packetId)
      const packet = challenge.packets.find((p) => p.id === packetId)
      onFeedback(`${packet?.label ?? packetId} applied! Now choose an engine below.`, 'success')
    } else {
      onFeedback('Enhance applied! Now click step 3: Apply style.', 'success')
    }
    recompute(nextSeq, choices)
  }

  const handleEngine = (engine: Engine) => {
    if (!pendingPacketId) return
    const outcome = onRoute(pendingPacketId, engine)
    const nextChoices = {
      ...choices,
      [pendingPacketId]: { engine: outcome.engine, fellBack: outcome.fellBack },
    }
    setChoices(nextChoices)
    setPendingPacketId(null)
    onFeedback(
      getCharacterVoiceLine(engine, outcome.isGood),
      outcome.isGood ? 'success' : 'warn',
    )
    recompute(sequence, nextChoices)
  }

  const handleReset = () => {
    setSequence([])
    setChoices({})
    setPendingPacketId(null)
    setActiveImageKey('before')
    resetChallengeRoutes(challenge.id)
    onFeedback('Reset! Apply tools in order: 1. Remove background → 2. Enhance → 3. Apply style.')
  }

  return (
    <div className="web-creator-layout">
      <div className="web-creator-preview">
        <img
          src={CREATOR_IMAGES[activeImageKey]}
          alt="Creator mode photo preview"
          className="web-creator-img"
        />
        <span className="web-demo-tag">Demo content — pre-generated transitions</span>
      </div>

      <div className="web-creator-controls">
        <div className="web-section-head">
          <span className="web-step-pill">Apply tools in order (1 → 2 → 3)</span>
          <button type="button" className="web-reset-btn" onClick={handleReset}>
            <RotateCcw size={15} aria-hidden="true" />
            Reset
          </button>
        </div>

        <div className="web-tool-list">
          {tools.map((tool, index) => {
            const done = sequence[index] === tool.id
            const isNext = sequence.length === index && !pendingPacketId
            return (
              <button
                key={tool.id}
                type="button"
                disabled={done || Boolean(pendingPacketId)}
                className={`web-tool-btn ${done ? 'web-tool-btn--done' : isNext ? 'web-tool-btn--next' : ''}`}
                onClick={() => handleToolTap(tool.id)}
              >
                <span className="web-tool-num">{done ? <Check size={16} /> : index + 1}</span>
                <span>{tool.label}</span>
              </button>
            )
          })}
        </div>

        <div className={`web-route-box ${pendingPacketId ? 'web-route-box--ready' : ''}`}>
          <p className="web-route-prompt">
            {pendingPacketId
              ? `Route "${challenge.packets.find((p) => p.id === pendingPacketId)?.label}" to an engine:`
              : 'Select the next tool above'}
          </p>
          <EngineButtons disabled={!pendingPacketId} onSelect={handleEngine} />
        </div>
      </div>
    </div>
  )
}

function PrivacyShieldView({
  challenge,
  elapsedMs,
  onRoute,
  onProgress,
  onComplete,
  onFeedback,
}: ChallengeProps) {
  const [choice, setChoice] = useState<ProcessingChoice | null>(null)
  const [leakChoice, setLeakChoice] = useState<string | null>(null)
  const [showLiveProof, setShowLiveProof] = useState(false)
  const followUp = challenge.followUp

  const computeScore = (c: ProcessingChoice | null, leak: string | null) =>
    scorePrivacyShield(
      {
        choice: c ?? 'cloud',
        leakChoice: leak,
        correctLeakId: followUp?.correctId ?? 'app-settings',
        elapsedMs: elapsedMs(),
      },
      gameConfig.scoring,
    )

  const handleRoute = (picked: ProcessingChoice) => {
    if (choice) return
    setChoice(picked)
    if (picked === 'local') {
      setShowLiveProof(true)
    }
    onRoute('confidential-document', picked === 'local' ? 'NPU' : 'CPU')
    onFeedback(
      picked === 'local'
        ? 'The Quiet Assistant: "Kept 100% on-device. Live offline proof expanded below!"'
        : 'Cloud route sent the document off-device. Answer the follow-up below.',
      picked === 'local' ? 'success' : 'warn',
    )
    onProgress(computeScore(picked, leakChoice))
  }

  const handleFollowUp = (optionId: string) => {
    if (!choice || leakChoice) return
    setLeakChoice(optionId)
    const score = computeScore(choice, optionId)
    onProgress(score)
    onComplete(score)
  }

  return (
    <div className="web-challenge-body">
      <div className={`privacy-meter-banner ${choice === 'cloud' ? 'privacy-meter-banner--cloud' : 'privacy-meter-banner--local'}`}>
        <div className="privacy-meter-title">
          {choice === 'cloud' ? (
            <>
              <UploadCloud size={20} aria-hidden="true" />
              <strong>What leaves your device? Document uploaded to external cloud</strong>
            </>
          ) : (
            <>
              <Lock size={20} aria-hidden="true" />
              <strong>
                What leaves your device?{' '}
                {choice === 'local' ? '0% — Everything stays on this laptop' : 'Pending your choice'}
              </strong>
            </>
          )}
        </div>
        <button
          type="button"
          className="small-button"
          onClick={() => setShowLiveProof((v) => !v)}
        >
          {showLiveProof ? 'Hide Live Offline Proof' : 'Try Live Offline Proof'}
        </button>
      </div>

      {showLiveProof && <LiveOnDeviceDemo />}

      <div className="web-privacy-grid">
        <button
          type="button"
          disabled={Boolean(choice)}
          className={`web-privacy-card web-privacy-card--local ${choice === 'local' ? 'web-privacy-card--selected' : ''}`}
          onClick={() => handleRoute('local')}
        >
          <ShieldCheck size={28} aria-hidden="true" />
          <strong>Process on this device (The Quiet Assistant)</strong>
          <span>Runs locally on the NPU — confidential contract never leaves your laptop</span>
        </button>

        <button
          type="button"
          disabled={Boolean(choice)}
          className={`web-privacy-card web-privacy-card--cloud ${choice === 'cloud' ? 'web-privacy-card--selected' : ''}`}
          onClick={() => handleRoute('cloud')}
        >
          <ShieldAlert size={28} aria-hidden="true" />
          <strong>Process in the cloud</strong>
          <span>Uploads the document to an external server</span>
        </button>
      </div>

      {followUp && (
        <div className={`web-route-box ${choice ? 'web-route-box--ready' : ''}`}>
          <p className="web-route-prompt">{followUp.prompt}</p>
          <div className="web-followup-grid">
            {followUp.options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={!choice || Boolean(leakChoice)}
                className={`web-chip ${leakChoice === option.id ? 'web-chip--active' : ''}`}
                onClick={() => handleFollowUp(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StreamNightView({
  challenge,
  elapsedMs,
  onRoute,
  onProgress,
  onComplete,
  onFeedback,
}: ChallengeProps) {
  const [choices, setChoices] = useState<Record<string, StreamNightChoice>>({})

  const result = scoreStreamNight(
    { routes: choices, elapsedMs: elapsedMs() },
    challenge.packets,
    gameConfig.scoring,
  )

  const handlePick = (packetId: string, engine: Engine) => {
    if (choices[packetId]) return
    const outcome = onRoute(packetId, engine)
    const next = { ...choices, [packetId]: { engine, fellBack: outcome.fellBack } }
    setChoices(next)

    const nextResult = scoreStreamNight(
      { routes: next, elapsedMs: elapsedMs() },
      challenge.packets,
      gameConfig.scoring,
    )
    onProgress(nextResult.score)

    onFeedback(
      getCharacterVoiceLine(engine, outcome.isGood),
      outcome.isGood ? 'success' : 'warn',
    )

    if (Object.keys(next).length === challenge.packets.length) {
      onComplete(nextResult.score, nextResult.subscores)
    }
  }

  const stabilityLabel =
    result.stability >= 66 ? 'OK' : result.stability >= 34 ? 'WATCH' : 'LOW'
  const stabilityTone =
    result.stability >= 66 ? 'success' : result.stability >= 34 ? 'info' : 'warn'

  return (
    <div className="web-challenge-body">
      <div className="web-meter-box">
        <div className="web-meter-head">
          <span>
            Frame stability · Sourced GPU + NPU split (11–47 NPU TOPS, Intel Core Ultra Spec)
          </span>
          <strong className={`web-tone-${stabilityTone}`}>{stabilityLabel}</strong>
        </div>
        <div className="web-meter-track">
          <div
            className={`web-meter-fill web-meter-fill--${stabilityTone}`}
            style={{ width: `${result.stability}%` }}
          />
        </div>
      </div>

      <div className="web-task-list">
        {challenge.packets.map((packet) => {
          const picked = choices[packet.id]
          return (
            <div key={packet.id} className="web-task-row">
              <div className="web-task-info">
                <strong>{packet.label}</strong>
                {picked && (
                  <span className={`web-task-badge ${picked.fellBack ? 'web-task-badge--warn' : 'web-task-badge--ok'}`}>
                    {picked.fellBack
                      ? `Fell back → ${packet.fallbackEngine}`
                      : `Routed → ${ENGINE_CHARACTERS[picked.engine].name}`}
                  </span>
                )}
              </div>
              <div className="web-task-actions">
                {ENGINES.map((engine) => (
                  <button
                    key={engine}
                    type="button"
                    disabled={Boolean(picked)}
                    className={`web-mini-engine ${picked?.engine === engine ? 'web-mini-engine--active' : ''}`}
                    onClick={() => handlePick(packet.id, engine)}
                  >
                    {engine}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface BossTask {
  id: string
  packetId: string | null
  title: string
  hint: string
  bestEngine: Engine
}

const DEADLINE_TASKS: BossTask[] = [
  {
    id: 'meeting-captions',
    packetId: 'notes-summary-batch',
    title: 'Meeting starts — live captions & notes',
    hint: 'On-device speech/text AI',
    bestEngine: 'NPU',
  },
  {
    id: 'call-blur',
    packetId: 'background-blur-batch',
    title: 'Video call needs background blur',
    hint: 'Continuous camera AI effect',
    bestEngine: 'NPU',
  },
  {
    id: 'file-compress',
    packetId: 'browser-tabs',
    title: 'Project file needs compressing',
    hint: 'General file & tab workload',
    bestEngine: 'CPU',
  },
  {
    id: 'video-export',
    packetId: 'video-export',
    title: 'Client promo clip export',
    hint: 'Heavy media rendering',
    bestEngine: 'GPU',
  },
  {
    id: 'report-recalc',
    packetId: 'spreadsheet-recalc',
    title: 'Report due — spreadsheet recalculation',
    hint: 'Single-thread logic & formulas',
    bestEngine: 'CPU',
  },
  {
    id: 'final-summary',
    packetId: null,
    title: 'Executive recap before send',
    hint: 'Quick on-device AI summary',
    bestEngine: 'NPU',
  },
]

function DeadlineDayBossView({
  challenge,
  elapsedMs,
  onRoute,
  onProgress,
  onComplete,
  onFeedback,
}: ChallengeProps) {
  const [visibleCount, setVisibleCount] = useState(2)
  const [taskChoices, setTaskChoices] = useState<Record<string, Engine>>({})
  const [packetChoices, setPacketChoices] = useState<Record<string, BatteryEscapeChoice>>({})

  useEffect(() => {
    if (visibleCount >= DEADLINE_TASKS.length) return
    const timer = window.setInterval(() => {
      setVisibleCount((c) => {
        const next = Math.min(DEADLINE_TASKS.length, c + 1)
        if (next > c) {
          playTaskArrivalTick()
        }
        return next
      })
    }, 2200)
    return () => window.clearInterval(timer)
  }, [visibleCount])

  const batteryResult = scoreBatteryEscape(
    { routes: packetChoices, elapsedMs: elapsedMs() },
    challenge.packets,
    gameConfig.scoring,
  )

  const handlePick = (task: BossTask, engine: Engine) => {
    if (taskChoices[task.id]) return
    const nextTasks = { ...taskChoices, [task.id]: engine }
    setTaskChoices(nextTasks)

    let nextPackets = packetChoices
    let isGood = engine === task.bestEngine

    if (task.packetId) {
      const outcome = onRoute(task.packetId, engine)
      nextPackets = {
        ...packetChoices,
        [task.packetId]: { engine, fellBack: outcome.fellBack },
      }
      setPacketChoices(nextPackets)
      isGood = outcome.isGood
    } else {
      const nextCombo = useGameStore.getState().recordCombo(isGood, engine)
      if (isGood) playGoodChime(nextCombo)
      else playWarnHum()
    }

    const updated = scoreBatteryEscape(
      { routes: nextPackets, elapsedMs: elapsedMs() },
      challenge.packets,
      gameConfig.scoring,
    )
    const correctBossTasks = DEADLINE_TASKS.filter((t) => nextTasks[t.id] === t.bestEngine).length
    const bossBonus =
      Object.keys(nextTasks).length === DEADLINE_TASKS.length && correctBossTasks >= 4 ? 100 : 0
    if (bossBonus > 0) {
      useGameStore.getState().setBossCleared(true)
    }

    onProgress(Math.min(gameConfig.scoring.maxScore, updated.score + bossBonus))
    onFeedback(
      getCharacterVoiceLine(engine, isGood),
      isGood ? 'success' : 'warn',
    )

    if (Object.keys(nextTasks).length === DEADLINE_TASKS.length) {
      onComplete(
        Math.min(gameConfig.scoring.maxScore, updated.score + bossBonus),
        updated.subscores,
      )
    }
  }

  const batteryLabel =
    batteryResult.remainingBattery >= 60 ? 'Steady' : batteryResult.remainingBattery >= 30 ? 'Dropping' : 'Low'
  const batteryTone =
    batteryResult.remainingBattery >= 60 ? 'success' : batteryResult.remainingBattery >= 30 ? 'info' : 'warn'

  const arriving = DEADLINE_TASKS.slice(0, visibleCount)

  return (
    <div className="web-challenge-body">
      <div className="web-meter-box">
        <div className="web-meter-head">
          <span>
            Deadline Day ({Object.keys(taskChoices).length}/{DEADLINE_TASKS.length} routed) · 64–76 Wh battery, 17–28W TDP (DEL01 &amp; Intel Spec)
          </span>
          <div className="boss-status-pills">
            {visibleCount < DEADLINE_TASKS.length && (
              <span className="boss-queue-pulse">
                INCOMING TASK QUEUE ({visibleCount}/{DEADLINE_TASKS.length})
              </span>
            )}
            <strong className={`web-tone-${batteryTone}`}>{batteryLabel}</strong>
          </div>
        </div>
        <div className="web-meter-track">
          <div
            className={`web-meter-fill web-meter-fill--${batteryTone}`}
            style={{ width: `${batteryResult.remainingBattery}%` }}
          />
        </div>
      </div>

      <div className="web-task-list">
        {arriving.map((task, idx) => {
          const picked = taskChoices[task.id]
          const isNewlyArrived = idx >= 2 && idx === visibleCount - 1 && !picked
          return (
            <div key={task.id} className={`web-task-row ${isNewlyArrived ? 'boss-task-arrive' : ''}`}>
              <div className="web-task-info">
                <strong>{task.title}</strong>
                <span className="web-task-sub">{task.hint}</span>
                {picked && (
                  <span
                    className={`web-task-badge ${picked === task.bestEngine ? 'web-task-badge--ok' : 'web-task-badge--warn'}`}
                  >
                    {ENGINE_CHARACTERS[picked].name}
                  </span>
                )}
              </div>
              <div className="web-task-actions">
                {ENGINES.map((engine) => (
                  <button
                    key={engine}
                    type="button"
                    disabled={Boolean(picked)}
                    className={`web-mini-engine ${picked === engine ? 'web-mini-engine--active' : ''}`}
                    onClick={() => handlePick(task, engine)}
                  >
                    {engine}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WebGameStage({
  onAdvance,
}: {
  onAdvance: () => void
}) {
  const phase = useGameStore((s) => s.phase)
  const currentChallenge = useGameStore((s) => s.currentChallenge)
  const race = useGameStore((s) => s.race)
  const combo = useGameStore((s) => s.combo ?? 0)
  const challengeStatus = useGameStore((s) => s.challengeStatus)

  const challenge =
    phase === 'challenges' ? getChallengeByIndex(currentChallenge) : undefined

  const [feedback, setFeedback] = useState('')
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'success' | 'warn'>('neutral')
  const [doneMessage, setDoneMessage] = useState<string | null>(null)
  const [routedCount, setRoutedCount] = useState(0)
  const [fallbackCount, setFallbackCount] = useState(0)
  const [leaderboardRecorded, setLeaderboardRecorded] = useState(false)

  useEffect(() => {
    if (phase !== 'race-finish' || leaderboardRecorded) return
    const state = useGameStore.getState()
    const total = Object.values(state.challengeScores).reduce((sum, s) => sum + s, 0)
    recordLeaderboardScore(state.storeId, {
      tag: state.bossCleared ? 'MASTER-ROUTER' : 'YOU',
      title: state.bossCleared ? 'Deadline Boss Cleared' : "Today’s Challenger",
      score: total,
      maxCombo: state.maxCombo ?? 0,
      bossCleared: Boolean(state.bossCleared),
    })
    setLeaderboardRecorded(true)
  }, [phase, leaderboardRecorded])
  const startTimeRef = useRef<number>(Date.now())
  const localRoutesRef = useRef<Record<string, PacketRoute>>({})

  useEffect(() => {
    startTimeRef.current = Date.now()
    localRoutesRef.current = {}
    setDoneMessage(null)
    setRoutedCount(0)
    setFallbackCount(0)
    if (challenge) {
      setFeedback(
        challenge.id === 'battery-escape'
          ? 'Deadline Day! Route all 6 arriving tasks before time runs out.'
          : challenge.objective,
      )
      setFeedbackTone('neutral')
    }
  }, [phase, currentChallenge, challenge?.id])

  const publishRace = (routesOverride?: Record<string, PacketRoute>) => {
    const state = useGameStore.getState()
    const statuses = state.challengeStatus
    const skipped = new Set<ChallengeId>(
      gameConfig.challenges.filter((c) => statuses[c.id] === 'skipped').map((c) => c.id),
    )
    const progress = computeRaceProgress(
      allPackets,
      { ...state.packetRoutes, ...(routesOverride ?? localRoutesRef.current) },
      gameConfig.race,
      skipped,
    )
    gameBus.emit('race:update', {
      ...progress,
      segmentId: challenge ? `challenge-${challenge.index}` : phase,
    })
  }

  const handleRoute = (packetId: string, engine: Engine) => {
    if (!challenge) return { engine, fellBack: false, isGood: true }
    const packet = getChallenge(challenge.id).packets.find((p) => p.id === packetId)
    if (!packet) return { engine, fellBack: false, isGood: true }

    const outcome = resolveRoute(packet, engine, gameConfig.race)
    const isGood = routeIsCorrect(packet, outcome.engine, outcome.fellBack)
    localRoutesRef.current[packet.id] = {
      routedTo: outcome.engine,
      fellBack: outcome.fellBack,
    }
    setRoutedCount((c) => c + 1)
    if (outcome.fellBack) {
      setFallbackCount((c) => c + 1)
    }

    const nextCombo = useGameStore.getState().recordCombo(isGood, engine)
    if (isGood) {
      playGoodChime(nextCombo)
    } else {
      playWarnHum()
    }

    gameBus.emit('packet:routed', {
      challengeId: challenge.id,
      packetId: packet.id,
      routedTo: engine,
      fellBack: outcome.fellBack,
    })

    if (outcome.fellBack) {
      gameBus.emit('packet:fallback', {
        challengeId: challenge.id,
        packetId: packet.id,
        from: 'NPU',
        to: packet.fallbackEngine,
        captionKey: 'fallback',
      })
    }

    publishRace()
    return { engine: outcome.engine, fellBack: outcome.fellBack, isGood }
  }

  const handleProgress = (score: number) => {
    if (!challenge) return
    gameBus.emit('challenge:progress', { challengeId: challenge.id, score })
  }

  const handleComplete = (score: number, subscores?: Record<string, number>) => {
    if (!challenge) return
    playCompleteChord()
    const elapsed = Math.min(challenge.timeLimitMs, Date.now() - startTimeRef.current)
    gameBus.emit('challenge:complete', {
      challengeId: challenge.id,
      status: 'completed',
      score,
      durationMs: elapsed,
      subscores,
    })
    setFeedback(challenge.educationalMessage)
    setFeedbackTone('success')
    setDoneMessage(challenge.resultLine ?? 'Challenge complete!')
  }

  if (phase === 'setup') {
    return (
      <section className="web-stage-card" aria-label="Race setup">
        <div className="web-setup-grid">
          <div className="web-setup-lane web-setup-lane--left">
            <span className="web-setup-badge web-setup-badge--left">GHOST LAPTOP · NO NPU</span>
            <h3>CPU &amp; GPU carry everything</h3>
            <p>AI blur, summaries, and background tasks pile up on general-purpose processors.</p>
          </div>
          <div className="web-setup-lane web-setup-lane--right">
            <span className="web-setup-badge web-setup-badge--right">AI PC · 3 SPECIALISTS</span>
            <h3>The Generalist, The Heavy Lifter &amp; The Quiet Assistant</h3>
            <p>Route each task to the right character to keep frames smooth and power low.</p>
          </div>
        </div>
        <div className="web-stage-actions">
          <button type="button" className="primary-button" onClick={onAdvance}>
            START CHALLENGE 1
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </section>
    )
  }


  if (phase === 'race-finish') {
    const state = useGameStore.getState()
    const entries = listDailyLeaderboard(state.storeId)
    const winner =
      race.rightProgress > race.leftProgress
        ? 'AI PC (with The Quiet Assistant) finished ahead!'
        : race.leftProgress > race.rightProgress
          ? 'Ghost Laptop finished ahead.'
          : 'Both lanes finished level.'

    return (
      <section className="web-stage-card" aria-label="Race finish">
        <div className="web-finish-banner">
          <Cpu size={28} aria-hidden="true" />
          <div>
            <h2>{winner}</h2>
            <p>
              Max combo: <strong>{state.maxCombo ?? 0}x</strong>
              {state.bossCleared ? ' · Master Router Boss Reward (+100) unlocked!' : ''}
            </p>
          </div>
        </div>

        <div className="leaderboard-box">
          <div className="leaderboard-head">
            <Trophy size={18} aria-hidden="true" />
            <strong>Today&apos;s Store Leaderboard ({state.storeId})</strong>
          </div>
          <ol className="leaderboard-list">
            {entries.slice(0, 5).map((entry, idx) => (
              <li key={entry.id} className="leaderboard-row">
                <span className="leaderboard-rank">#{idx + 1}</span>
                <span className="leaderboard-tag">{entry.tag}</span>
                <span className="leaderboard-title">{entry.title}</span>
                <strong className="leaderboard-score">{entry.score} pts</strong>
              </li>
            ))}
          </ol>
        </div>

        <LiveOnDeviceDemo />
        <div className="web-stage-actions">
          <button type="button" className="primary-button" onClick={onAdvance}>
            REVEAL COLLECTIBLE CARD
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </section>
    )
  }

  if (!challenge) {
    return null
  }

  const isCompleted = challengeStatus[challenge.id] !== 'pending' || Boolean(doneMessage)

  const props: ChallengeProps = {
    challenge,
    elapsedMs: () => Date.now() - startTimeRef.current,
    onRoute: handleRoute,
    onProgress: handleProgress,
    onComplete: handleComplete,
    onFeedback: (text, tone = 'neutral') => {
      setFeedback(text)
      setFeedbackTone(tone)
    },
  }

  return (
    <section className="web-stage-card" aria-label={challenge.title}>
      <div className={`web-feedback web-feedback--${feedbackTone}`} aria-live="polite">
        {feedback}
      </div>

      <div className="web-split-stage">
        <div className="web-split-main">
          {challenge.id === 'study-sprint' && <StudySprintView {...props} />}
          {challenge.id === 'creator-mode' && <CreatorModeView {...props} />}
          {challenge.id === 'privacy-shield' && <PrivacyShieldView {...props} />}
          {challenge.id === 'stream-night' && <StreamNightView {...props} />}
          {challenge.id === 'battery-escape' && <DeadlineDayBossView {...props} />}
        </div>

        <GhostLaptopPanel routedCount={routedCount} fallbacks={fallbackCount} combo={combo} />
      </div>

      {isCompleted && (
        <div className="web-stage-actions">
          <button type="button" className="primary-button" onClick={onAdvance}>
            {currentChallenge < 5 ? `NEXT: CHALLENGE ${currentChallenge + 1}` : 'VIEW RACE FINISH'}
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  )
}
