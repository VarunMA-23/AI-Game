import type { GameObjects, Input } from 'phaser'
import { gameConfig } from '../config/loadConfig'
import { resolveRoute } from '../race/routing'
import { scoreStreamNight } from '../scoring/streamNight'
import type { StreamNightChoice } from '../scoring/streamNight'
import type { Engine } from '../../types/game'
import { ChallengeScene, ENGINE_X } from './ChallengeScene'
import { SCENE_KEYS } from './BootScene'
import { addLabel, COLORS, FONT_DISPLAY } from './theme'

const ENGINES: Engine[] = ['CPU', 'GPU', 'NPU']

interface Chip {
  container: GameObjects.Container
  homeX: number
  homeY: number
}

export class StreamNightScene extends ChallengeScene {
  private chips = new Map<string, Chip>()
  private activePacketId: string | null = null
  private choices: Record<string, StreamNightChoice> = {}
  private meterFill!: GameObjects.Rectangle
  private meterLabel!: GameObjects.Text

  constructor() {
    super(SCENE_KEYS.streamNight)
  }

  protected create(): void {
    super.create()

    addLabel(this, 640, 88, 'Frame stability — illustrative. No speed or timing shown.', {
      size: 18,
      origin: 0.5,
      color: COLORS.muted,
    })
    this.add.rectangle(680, 120, 480, 22, COLORS.navySoft, 1).setStrokeStyle(2, COLORS.intel)
    this.meterFill = this.add
      .rectangle(440, 120, 480, 18, COLORS.success, 1)
      .setOrigin(0, 0.5)
    this.meterLabel = addLabel(this, 680, 150, 'Frame stability: OK', {
      size: 18,
      origin: 0.5,
      color: COLORS.success,
    })

    this.challenge.packets.forEach((packet, index) => {
      const homeX = 640
      const homeY = 176 + index * 88
      const width = 520
      const background = this.add.rectangle(0, 0, width, 88, COLORS.navySoft, 1)
      const text = this.add
        .text(0, 0, packet.label, {
          fontFamily: FONT_DISPLAY,
          fontSize: '20px',
          color: '#0f172a',
        })
        .setOrigin(0.5)
      const container = this.add
        .container(homeX, homeY, [background, text])
        .setSize(width, 88)
        .setInteractive({ useHandCursor: true, draggable: true })

      container.on('pointerdown', () => this.selectPacket(packet.id))
      container.on('dragstart', () => this.selectPacket(packet.id))
      container.on('drag', (_pointer: Input.Pointer, dragX: number, dragY: number) => {
        container.setPosition(dragX, dragY)
      })
      container.on('dragend', (pointer: Input.Pointer) => {
        const engine = this.engineAt(pointer.x, pointer.y)
        if (engine) {
          this.onEngineChoice(engine)
        }
        container.setPosition(homeX, homeY)
      })

      this.chips.set(packet.id, { container, homeX, homeY })
    })

    this.createEngineButtons('Tap a packet, then choose an engine — or drag it onto one', (engine) => {
      this.onEngineChoice(engine)
    })
    this.recompute()
  }

  private selectPacket(packetId: string): void {
    if (this.completed) {
      return
    }
    this.activePacketId = packetId
    for (const [id, chip] of this.chips) {
      const active = id === packetId
      const rectangle = chip.container.list[0] as GameObjects.Rectangle
      const label = chip.container.list[1] as GameObjects.Text
      rectangle.setFillStyle(active ? COLORS.intel : COLORS.navySoft, 1)
      rectangle.setStrokeStyle(2, active ? COLORS.cyan : COLORS.intel)
      label.setColor(active ? '#ffffff' : '#0f172a')
    }
    const packet = this.challenge.packets.find((item) => item.id === packetId)
    this.setFeedback(`${packet?.label ?? packetId} selected. Choose CPU, GPU or NPU.`)
  }

  private engineAt(x: number, y: number): Engine | null {
    if (y < 470 || y > 546) {
      return null
    }
    return ENGINES.find((engine) => Math.abs(x - ENGINE_X[engine]) <= 75) ?? null
  }

  private onEngineChoice(engine: Engine): void {
    if (!this.activePacketId || this.completed) {
      return
    }
    const packet = this.challenge.packets.find(
      (item) => item.id === this.activePacketId,
    )
    if (!packet) {
      return
    }
    const outcome = resolveRoute(packet, engine, gameConfig.race)
    this.choices[packet.id] = { engine, fellBack: outcome.fellBack }
    this.routePacket(packet.id, engine)
    this.setFeedback(
      outcome.fellBack
        ? 'That packet is not set up for the NPU here. It fell back.'
        : `${packet.label} routed to ${engine}.`,
      outcome.fellBack ? COLORS.rival : COLORS.success,
    )
    this.recompute()
  }

  private recompute(): void {
    const result = scoreStreamNight(
      {
        routes: this.choices,
        elapsedMs: this.challenge.timeLimitMs - this.remainingMs,
      },
      this.challenge.packets,
      gameConfig.scoring,
    )
    this.reportProgress(result.score)
    this.meterFill.setScale(result.stability / 100, 1)
    const color =
      result.stability >= 66 ? COLORS.success : result.stability >= 34 ? COLORS.cyan : COLORS.rival
    this.meterFill.setFillStyle(color, 1)
    this.meterLabel
      .setText(
        `Frame stability: ${result.stability >= 66 ? 'OK' : result.stability >= 34 ? 'WATCH' : 'LOW'} (illustrative)`,
      )
      .setColor(`#${color.toString(16).padStart(6, '0')}`)

    if (
      Object.keys(this.choices).length === this.challenge.packets.length &&
      !this.completed
    ) {
      this.complete('completed', result.score, result.subscores)
    }
  }
}
