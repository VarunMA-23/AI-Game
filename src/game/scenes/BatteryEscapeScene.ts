import type { GameObjects } from 'phaser'
import { gameConfig } from '../config/loadConfig'
import { resolveRoute } from '../race/routing'
import { batteryDrainFor, scoreBatteryEscape } from '../scoring/batteryEscape'
import type { BatteryEscapeChoice } from '../scoring/batteryEscape'
import type { Engine } from '../../types/game'
import { ChallengeScene } from './ChallengeScene'
import { SCENE_KEYS } from './BootScene'
import { addLabel, COLORS, FONT_DISPLAY } from './theme'

interface Chip {
  container: GameObjects.Container
  homeY: number
}

const chipPosition = (index: number): { x: number; y: number } => ({
  x: index < 3 ? 340 : 940,
  y: 180 + (index % 3) * 88 + (index >= 3 ? 20 : 0),
})

export class BatteryEscapeScene extends ChallengeScene {
  private chips = new Map<string, Chip>()
  private activePacketId: string | null = null
  private choices: Record<string, BatteryEscapeChoice> = {}
  private batteryFill!: GameObjects.Rectangle
  private batteryLabel!: GameObjects.Text

  constructor() {
    super(SCENE_KEYS.batteryEscape)
  }

  protected create(): void {
    super.create()

    addLabel(this, 640, 84, 'Illustrative battery — no hours, minutes or real savings shown.', {
      size: 18,
      origin: 0.5,
      color: COLORS.muted,
    })
    this.add.rectangle(680, 112, 480, 22, COLORS.navySoft, 1).setStrokeStyle(2, COLORS.intel)
    this.batteryFill = this.add
      .rectangle(440, 112, 480, 18, COLORS.success, 1)
      .setOrigin(0, 0.5)
    this.batteryLabel = addLabel(this, 640, 142, 'Battery: steady (illustrative)', {
      size: 18,
      origin: 0.5,
      color: COLORS.success,
    })

    this.challenge.packets.forEach((packet, index) => {
      const width = Math.max(300, packet.label.length * 10 + 60)
      const position = chipPosition(index)
      const background = this.add.rectangle(0, 0, width, 88, COLORS.navySoft, 1)
      const label = this.add
        .text(0, 0, packet.label, {
          fontFamily: FONT_DISPLAY,
          fontSize: '20px',
          color: '#0f172a',
        })
        .setOrigin(0.5)
      const container = this.add
        .container(position.x, position.y, [background, label])
        .setSize(width, 88)
        .setInteractive({ useHandCursor: true })
      container.on('pointerdown', () => this.selectPacket(packet.id))
      this.chips.set(packet.id, { container, homeY: position.y })
    })

    this.createEngineButtons('Tap a task, then choose CPU, GPU or NPU', (engine) => {
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
      this.setChipActive(chip.container, id === packetId)
    }
    const packet = this.challenge.packets.find((item) => item.id === packetId)
    this.setFeedback(`${packet?.label ?? packetId} selected. Choose an engine.`)
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
    const choice: BatteryEscapeChoice = { engine, fellBack: outcome.fellBack }
    const drain = batteryDrainFor(packet, choice, gameConfig.scoring)
    this.choices[packet.id] = choice
    this.routePacket(packet.id, engine)

    if (packet.npuBenefit === 'none' && engine === 'NPU') {
      this.emitCaption(gameConfig.race.noChangeCaption, 2400)
      this.setFeedback('No NPU benefit here. The illustrative meter does not change.', COLORS.cyan)
    } else if (drain <= gameConfig.scoring.batteryEscape.gpuSuitableDrain) {
      this.setFeedback('This task barely moves the illustrative meter.', COLORS.success)
    } else {
      this.setFeedback(`${packet.label} routed to ${engine}.`, COLORS.success)
    }
    this.recompute()

    const chip = this.chips.get(packet.id)
    if (chip) {
      this.setChipActive(chip.container, false)
    }
    this.activePacketId = null
  }

  private recompute(): void {
    const result = scoreBatteryEscape(
      {
        routes: this.choices,
        elapsedMs: this.challenge.timeLimitMs - this.remainingMs,
      },
      this.challenge.packets,
      gameConfig.scoring,
    )
    this.reportProgress(result.score)
    this.batteryFill.setScale(result.remainingBattery / 100, 1)
    const color =
      result.remainingBattery >= 60
        ? COLORS.success
        : result.remainingBattery >= 30
          ? COLORS.cyan
          : COLORS.rival
    this.batteryFill.setFillStyle(color, 1)
    this.batteryLabel
      .setText(
        `Battery: ${
          result.remainingBattery >= 60
            ? 'steady'
            : result.remainingBattery >= 30
              ? 'dropping'
              : 'low'
        } (illustrative)`,
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
