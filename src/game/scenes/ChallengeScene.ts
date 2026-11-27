import Phaser from 'phaser'
import { useGameStore } from '../../store/gameStore'
import type {
  ChallengeDefinition,
  ChallengeId,
  ChallengeStatus,
  Engine,
  PacketRoute,
} from '../../types/game'
import { allPackets, gameConfig, getChallenge } from '../config/loadConfig'
import { gameBus } from '../events/bus'
import { computeRaceProgress, resolveRoute } from '../race/routing'
import { addBackdrop, addLabel, COLORS, FONT_DISPLAY } from './theme'

interface ChallengeSceneData {
  challengeId: ChallengeId
}

export const ENGINE_X: Record<Engine, number> = {
  CPU: 450,
  GPU: 640,
  NPU: 830,
}

export abstract class ChallengeScene extends Phaser.Scene {
  protected challenge!: ChallengeDefinition
  protected completed = false
  protected remainingMs = 0
  protected feedback!: Phaser.GameObjects.Text

  private tick?: Phaser.Time.TimerEvent
  private routes: Record<string, PacketRoute> = {}
  private unsubscribers: Array<() => void> = []

  constructor(key: string) {
    super(key)
  }

  init(data: ChallengeSceneData): void {
    this.challenge = getChallenge(data.challengeId)
    this.completed = false
    this.remainingMs = this.challenge.timeLimitMs
    this.routes = {}
    this.unsubscribers = []
  }

  protected create(): void {
    addBackdrop(this)
    this.addChallengeChrome()

    this.unsubscribers.push(
      gameBus.on('challenge:skip', (payload) => {
        if (payload.challengeId === this.challenge.id) {
          this.handleSkip()
        }
      }),
    )
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)

    this.publishRaceProgress()
    this.setFeedback(this.challenge.objective)

    this.tick = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: this.onTick,
      callbackScope: this,
    })
  }

  private addChallengeChrome(): void {
    this.feedback = addLabel(this, 40, 28, '', {
      size: 22,
      color: COLORS.white,
      width: 1200,
    })
  }

  protected setFeedback(text: string, color: number = COLORS.white): void {
    this.feedback?.setText(text).setColor(`#${color.toString(16).padStart(6, '0')}`)
  }

  protected emitCaption(text: string, durationMs = 2000): void {
    gameBus.emit('game:caption', { text, durationMs })
  }

  protected createEngineButtons(caption: string, handler: (engine: Engine) => void): void {
    addLabel(this, 640, 444, caption, { size: 18, origin: 0.5 })

    const engines: Engine[] = ['CPU', 'GPU', 'NPU']
    for (const engine of engines) {
      const button = this.add
        .rectangle(ENGINE_X[engine], 508, 150, 88, COLORS.navySoft, 1)
        .setStrokeStyle(2, COLORS.intel)
        .setInteractive({ useHandCursor: true })
      addLabel(this, ENGINE_X[engine], 508, engine, {
        size: 24,
        display: true,
        origin: 0.5,
      })
      button.on('pointerdown', () => handler(engine))
      button.on('pointerover', () => button.setFillStyle(COLORS.intel, 0.55))
      button.on('pointerout', () => button.setFillStyle(COLORS.navySoft, 1))
    }
  }

  protected routePacket(packetId: string, engine: Engine): boolean {
    const packet = this.challenge.packets.find((item) => item.id === packetId)
    if (!packet || this.completed) {
      return false
    }

    const outcome = resolveRoute(packet, engine, gameConfig.race)
    this.routes[packet.id] = { routedTo: outcome.engine, fellBack: outcome.fellBack }

    gameBus.emit('packet:routed', {
      challengeId: this.challenge.id,
      packetId: packet.id,
      routedTo: engine,
      fellBack: outcome.fellBack,
    })

    if (outcome.fellBack) {
      gameBus.emit('packet:fallback', {
        challengeId: this.challenge.id,
        packetId: packet.id,
        from: 'NPU',
        to: packet.fallbackEngine,
        captionKey: 'fallback',
      })
      this.emitCaption(outcome.caption ?? '')
    }

    this.animatePacket(engine, outcome.fellBack, packet.fallbackEngine)
    this.publishRaceProgress()
    return true
  }

  protected animatePacket(
    chosen: Engine,
    fellBack: boolean,
    fallbackEngine: Engine,
  ): void {
    const token = this.add
      .rectangle(640, 402, 96, 34, COLORS.cyan, 1)
      .setStrokeStyle(2, COLORS.navy)

    const targetX = fellBack ? ENGINE_X.NPU : ENGINE_X[chosen]
    this.tweens.add({
      targets: token,
      x: targetX,
      y: 476,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!fellBack) {
          token.destroy()
          return
        }
        this.tweens.add({
          targets: token,
          x: ENGINE_X[fallbackEngine],
          y: 476,
          duration: 300,
          ease: 'Quad.easeInOut',
          onComplete: () => token.destroy(),
        })
      },
    })
  }

  protected publishRaceProgress(): void {
    const state = useGameStore.getState()
    const statuses = state.challengeStatus
    const skipped = new Set(
      gameConfig.challenges
        .filter((challenge) => statuses[challenge.id] === 'skipped')
        .map((challenge) => challenge.id),
    )
    const progress = computeRaceProgress(
      allPackets,
      { ...state.packetRoutes, ...this.routes },
      gameConfig.race,
      skipped,
    )
    gameBus.emit('race:update', {
      ...progress,
      segmentId: `challenge-${this.challenge.index}`,
    })
  }

  protected reportProgress(score: number): void {
    if (this.completed) {
      return
    }
    gameBus.emit('challenge:progress', { challengeId: this.challenge.id, score })
  }

  protected complete(
    status: ChallengeStatus,
    score: number,
    subscores?: Record<string, number>,
  ): void {
    if (this.completed) {
      return
    }
    this.completed = true
    this.tick?.remove()
    this.tick = undefined
    gameBus.emit('timer:tick', {
      challengeId: this.challenge.id,
      remainingMs: this.remainingMs,
    })
    gameBus.emit('challenge:complete', {
      challengeId: this.challenge.id,
      status,
      score,
      durationMs: this.challenge.timeLimitMs - this.remainingMs,
      subscores,
    })
    this.setFeedback(this.challenge.educationalMessage, COLORS.success)
    if (this.challenge.resultLine) {
      this.emitCaption(this.challenge.resultLine, 4000)
    }
  }

  protected bestScore(): number {
    return useGameStore.getState().challengeScores[this.challenge.id]
  }

  private onTick(): void {
    this.remainingMs = Math.max(0, this.remainingMs - 100)
    gameBus.emit('timer:tick', {
      challengeId: this.challenge.id,
      remainingMs: this.remainingMs,
    })

    if (this.remainingMs <= 0) {
      this.complete('timed-out', this.bestScore())
    }
  }

  private handleSkip(): void {
    if (this.completed) {
      return
    }
    this.completed = true
    this.tick?.remove()
    this.tick = undefined
    this.setFeedback(gameConfig.race.skipCaption, COLORS.muted)
    this.emitCaption(gameConfig.race.skipCaption)
    this.publishRaceProgress()
  }

  private cleanup(): void {
    this.tick?.remove()
    this.tick = undefined
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe()
    }
    this.unsubscribers = []
    this.tweens.killAll()
  }

  protected registerCleanup(unsubscribe: () => void): void {
    this.unsubscribers.push(unsubscribe)
  }

  protected clearRoutes(): void {
    this.routes = {}
  }

  protected drawPacketChip(x: number, y: number, label: string, active: boolean): Phaser.GameObjects.Container {
    const width = Math.max(150, label.length * 10 + 44)
    const background = this.add
      .rectangle(0, 0, width, 88, active ? COLORS.electric : COLORS.navySoft, 1)
      .setStrokeStyle(2, active ? COLORS.cyan : COLORS.intel)
      .setInteractive({ useHandCursor: true })
    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT_DISPLAY,
        fontSize: '20px',
        color: active ? '#ffffff' : '#0f172a',
      })
      .setOrigin(0.5)
    return this.add.container(x, y, [background, text])
  }

  protected setChipActive(chip: Phaser.GameObjects.Container, active: boolean): void {
    const background = chip.list[0] as Phaser.GameObjects.Rectangle
    const text = chip.list[1] as Phaser.GameObjects.Text
    background.setFillStyle(active ? COLORS.electric : COLORS.navySoft, 1)
    background.setStrokeStyle(2, active ? COLORS.cyan : COLORS.intel)
    text.setColor(active ? '#ffffff' : '#0f172a')
  }
}
