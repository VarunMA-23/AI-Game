import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Cpu, RotateCcw, ShieldCheck, ShieldAlert } from 'lucide-react'
import { allPackets, gameConfig, getChallenge, getChallengeByIndex } from '../../game/config/loadConfig'
import { gameBus } from '../../game/events/bus'
import { computeRaceProgress, resolveRoute } from '../../game/race/routing'
import { batteryDrainFor, scoreBatteryEscape } from '../../game/scoring/batteryEscape'
import type { BatteryEscapeChoice } from '../../game/scoring/batteryEscape'
import { scoreCreatorMode } from '../../game/scoring/creatorMode'
import type { PacketChoice } from '../../game/scoring/creatorMode'
import { scorePrivacyShield } from '../../game/scoring/privacyShield'
import type { ProcessingChoice } from '../../game/scoring/privacyShield'
import { scoreStreamNight } from '../../game/scoring/streamNight'
import type { StreamNightChoice } from '../../game/scoring/streamNight'
import { scoreStudySprint } from '../../game/scoring/studySprint'
import { useGameStore } from '../../store/gameStore'
import type { ChallengeDefinition, ChallengeId, Engine, PacketRoute } from '../../types/game'

const ENGINES: Engine[] = ['CPU', 'GPU', 'NPU']

const ENGINE_HINTS: Record<Engine, string> = {
  CPU: 'General tasks',
  GPU: 'Graphics & video',
  NPU: 'On-device AI',
}

interface ChallengeProps {
  challenge: ChallengeDefinition
  elapsedMs: () => number
  onRoute: (packetId: string, engine: Engine) => { engine: Engine; fellBack: boolean }
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
      {ENGINES.map((engine) => (
        <button
          key={engine}
          type="button"
          disabled={disabled}
          className={`web-engine-btn ${selected === engine ? 'web-engine-btn--active' : ''}`}
          onClick={() => onSelect(engine)}
        >
          <span className="web-engine-name">{engine}</span>
          <span className="web-engine-hint">{ENGINE_HINTS[engine]}</span>
        </button>
      ))}
    </div>
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
      onFeedback('Summary ready! Now choose which engine should run it.', 'success')
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
    onRoute('notes-summary', engine)
    setRoutedEngine(engine)
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
      [pendingPacketId]: outcome,
    }
    setChoices(nextChoices)
    setPendingPacketId(null)
    onFeedback(
      outcome.fellBack
        ? `Fell back to ${outcome.engine}. Continue to the next step.`
        : `Routed to ${outcome.engine}. Continue to the next step.`,
      outcome.fellBack ? 'warn' : 'success',
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
    onRoute('confidential-document', picked === 'local' ? 'NPU' : 'CPU')
    onFeedback(
      picked === 'local'
        ? 'Document stays on this device! Now answer the follow-up question below.'
        : 'Document leaves this device for a cloud service. Answer the follow-up below.',
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
      <div className="web-doc-banner">
        <strong>CONFIDENTIAL CONTRACT</strong>
        <span>Fictional sample document — choose where AI summarizes it</span>
      </div>

      <div className="web-privacy-grid">
        <button
          type="button"
          disabled={Boolean(choice)}
          className={`web-privacy-card web-privacy-card--local ${choice === 'local' ? 'web-privacy-card--selected' : ''}`}
          onClick={() => handleRoute('local')}
        >
          <ShieldCheck size={28} aria-hidden="true" />
          <strong>Process on this device</strong>
          <span>Runs locally on the NPU — file never leaves your laptop</span>
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

    const packet = challenge.packets.find((p) => p.id === packetId)
    onFeedback(
      outcome.fellBack
        ? `${packet?.label} isn't set up for the NPU here — fell back to ${outcome.engine}.`
        : `${packet?.label} routed to ${engine}.`,
      outcome.fellBack ? 'warn' : 'success',
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
          <span>Frame stability (illustrative)</span>
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
                    {picked.fellBack ? `Fell back → ${packet.fallbackEngine}` : `Routed → ${picked.engine}`}
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

function BatteryEscapeView({
  challenge,
  elapsedMs,
  onRoute,
  onProgress,
  onComplete,
  onFeedback,
}: ChallengeProps) {
  const [choices, setChoices] = useState<Record<string, BatteryEscapeChoice>>({})

  const result = scoreBatteryEscape(
    { routes: choices, elapsedMs: elapsedMs() },
    challenge.packets,
    gameConfig.scoring,
  )

  const handlePick = (packetId: string, engine: Engine) => {
    if (choices[packetId]) return
    const packet = challenge.packets.find((p) => p.id === packetId)
    if (!packet) return

    const outcome = onRoute(packetId, engine)
    const choice: BatteryEscapeChoice = { engine, fellBack: outcome.fellBack }
    const drain = batteryDrainFor(packet, choice, gameConfig.scoring)
    const next = { ...choices, [packetId]: choice }
    setChoices(next)

    const nextResult = scoreBatteryEscape(
      { routes: next, elapsedMs: elapsedMs() },
      challenge.packets,
      gameConfig.scoring,
    )
    onProgress(nextResult.score)

    if (packet.npuBenefit === 'none' && engine === 'NPU') {
      onFeedback('No NPU benefit for this task — meter unchanged.', 'neutral')
    } else if (drain <= gameConfig.scoring.batteryEscape.gpuSuitableDrain) {
      onFeedback(`${packet.label} routed efficiently — minimal drain.`, 'success')
    } else {
      onFeedback(`${packet.label} routed to ${engine}.`, 'success')
    }

    if (Object.keys(next).length === challenge.packets.length) {
      onComplete(nextResult.score, nextResult.subscores)
    }
  }

  const batteryLabel =
    result.remainingBattery >= 60 ? 'Steady' : result.remainingBattery >= 30 ? 'Dropping' : 'Low'
  const batteryTone =
    result.remainingBattery >= 60 ? 'success' : result.remainingBattery >= 30 ? 'info' : 'warn'

  return (
    <div className="web-challenge-body">
      <div className="web-meter-box">
        <div className="web-meter-head">
          <span>Illustrative battery meter (no hours/minutes shown)</span>
          <strong className={`web-tone-${batteryTone}`}>{batteryLabel}</strong>
        </div>
        <div className="web-meter-track">
          <div
            className={`web-meter-fill web-meter-fill--${batteryTone}`}
            style={{ width: `${result.remainingBattery}%` }}
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
                    {picked.fellBack ? `Fell back → ${packet.fallbackEngine}` : `Routed → ${picked.engine}`}
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

export default function WebGameStage({
  onAdvance,
}: {
  onAdvance: () => void
}) {
  const phase = useGameStore((s) => s.phase)
  const currentChallenge = useGameStore((s) => s.currentChallenge)
  const race = useGameStore((s) => s.race)
  const challengeStatus = useGameStore((s) => s.challengeStatus)

  const challenge =
    phase === 'challenges' ? getChallengeByIndex(currentChallenge) : undefined

  const [feedback, setFeedback] = useState('')
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'success' | 'warn'>('neutral')
  const [doneMessage, setDoneMessage] = useState<string | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const localRoutesRef = useRef<Record<string, PacketRoute>>({})

  useEffect(() => {
    startTimeRef.current = Date.now()
    localRoutesRef.current = {}
    setDoneMessage(null)
    if (challenge) {
      setFeedback(challenge.objective)
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
    if (!challenge) return { engine, fellBack: false }
    const packet = getChallenge(challenge.id).packets.find((p) => p.id === packetId)
    if (!packet) return { engine, fellBack: false }

    const outcome = resolveRoute(packet, engine, gameConfig.race)
    localRoutesRef.current[packet.id] = {
      routedTo: outcome.engine,
      fellBack: outcome.fellBack,
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
      if (outcome.caption) {
        gameBus.emit('game:caption', { text: outcome.caption, durationMs: 2500 })
      }
    }

    publishRace()
    return { engine: outcome.engine, fellBack: outcome.fellBack }
  }

  const handleProgress = (score: number) => {
    if (!challenge) return
    gameBus.emit('challenge:progress', { challengeId: challenge.id, score })
  }

  const handleComplete = (score: number, subscores?: Record<string, number>) => {
    if (!challenge) return
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
            <span className="web-setup-badge web-setup-badge--left">WITHOUT NPU ROUTING</span>
            <h3>CPU or GPU only</h3>
            <p>Every AI and graphics task queues on general-purpose engines.</p>
          </div>
          <div className="web-setup-lane web-setup-lane--right">
            <span className="web-setup-badge web-setup-badge--right">WITH NPU ROUTING</span>
            <h3>Smart engine routing</h3>
            <p>Supported AI tasks run on the dedicated NPU, keeping CPU &amp; GPU free.</p>
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
    const winner =
      race.rightProgress > race.leftProgress
        ? 'With NPU routing finished ahead!'
        : race.leftProgress > race.rightProgress
          ? 'Without NPU routing finished ahead.'
          : 'Both lanes finished level.'

    return (
      <section className="web-stage-card" aria-label="Race finish">
        <div className="web-finish-banner">
          <Cpu size={28} aria-hidden="true" />
          <div>
            <h2>{winner}</h2>
            <p>Your routing choices shaped both the race and your AI PC profile.</p>
          </div>
        </div>
        <div className="web-stage-actions">
          <button type="button" className="primary-button" onClick={onAdvance}>
            SEE YOUR AI PC IDENTITY
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

      {challenge.id === 'study-sprint' && <StudySprintView {...props} />}
      {challenge.id === 'creator-mode' && <CreatorModeView {...props} />}
      {challenge.id === 'privacy-shield' && <PrivacyShieldView {...props} />}
      {challenge.id === 'stream-night' && <StreamNightView {...props} />}
      {challenge.id === 'battery-escape' && <BatteryEscapeView {...props} />}

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

