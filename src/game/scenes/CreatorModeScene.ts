import Phaser from 'phaser'
import { useGameStore } from '../../store/gameStore'
import { gameConfig } from '../config/loadConfig'
import { resolveRoute } from '../race/routing'
import { scoreCreatorMode } from '../scoring/creatorMode'
import type { PacketChoice } from '../scoring/creatorMode'
import { ChallengeScene } from './ChallengeScene'
import { SCENE_KEYS } from './BootScene'
import { addLabel, COLORS } from './theme'

const imageKeys: Record<string, string> = {
  before: 'creator-before',
  'background-removal': 'creator-removed',
  enhance: 'creator-enhanced',
  'style-filter': 'creator-styled',
}

export class CreatorModeScene extends ChallengeScene {
  private sequence: string[] = []
  private choices: Record<string, PacketChoice> = {}
  private pendingPacketId: string | null = null
  private currentImage!: Phaser.GameObjects.Image

  constructor() {
    super(SCENE_KEYS.creatorMode)
  }

  protected create(): void {
    super.create()

    const tools = this.challenge.tools ?? []
    addLabel(this, 640, 284, 'DEMO CONTENT — PRE-GENERATED TRANSITIONS', {
      size: 14,
      color: COLORS.cyan,
      origin: 0.5,
    })

    this.currentImage = this.add.image(640, 190, imageKeys.before).setScale(0.5)
    this.add
      .rectangle(640, 190, 248, 158, COLORS.navySoft, 0)
      .setStrokeStyle(2, COLORS.intel, 0.7)

    tools.forEach((tool, index) => {
      const x = 260 + index * 300
      const chip = this.drawPacketChip(x, 346, tool.label, false)
      chip.on('pointerdown', () => this.onToolTap(tool.id))
    })

    const reset = this.add
      .rectangle(1160, 346, 110, 88, COLORS.navySoft, 1)
      .setStrokeStyle(2, COLORS.rival)
      .setInteractive({ useHandCursor: true })
    addLabel(this, 1160, 346, 'RESET', {
      size: 16,
      display: true,
      origin: 0.5,
    })
    reset.on('pointerdown', () => this.reset())

    this.createEngineButtons('Route the active effect to an engine', (engine) => {
      if (!this.pendingPacketId) {
        return
      }
      const packet = this.challenge.packets.find(
        (item) => item.id === this.pendingPacketId,
      )
      if (!packet) {
        return
      }
      const outcome = resolveRoute(packet, engine, gameConfig.race)
      this.choices[packet.id] = {
        engine: outcome.engine,
        fellBack: outcome.fellBack,
      }
      this.routePacket(packet.id, engine)
      this.pendingPacketId = null
      this.setFeedback(`${packet.label} routed. Continue the sequence.`)
      this.recompute()
    })
  }

  private onToolTap(toolId: string): void {
    if (this.completed) {
      return
    }

    this.sequence.push(toolId)
    const expected = (this.challenge.tools ?? [])[this.sequence.length - 1]?.id

    if (toolId !== expected) {
      this.setFeedback('That tool is out of order. Reset to try again.', COLORS.rival)
      this.recompute()
      return
    }

    this.applyImage(toolId)
    const packetId = toolId === 'enhance' ? null : toolId
    if (packetId) {
      this.pendingPacketId = packetId
      const packet = this.challenge.packets.find((item) => item.id === packetId)
      this.setFeedback(`${packet?.label ?? packetId} ready. Route it to an engine.`)
    } else {
      this.setFeedback('Enhance applied. Pick the next tool.')
    }
    this.recompute()
  }

  private applyImage(toolId: string): void {
    const key = imageKeys[toolId]
    if (!key || !this.textures.exists(key)) {
      return
    }
    const next = this.add.image(640, 190, key).setScale(0.5).setAlpha(0)
    this.tweens.add({
      targets: next,
      alpha: 1,
      duration: 350,
      onComplete: () => {
        this.currentImage.destroy()
        this.currentImage = next
      },
    })
  }

  private recompute(): void {
    const result = scoreCreatorMode(
      {
        sequence: this.sequence,
        routes: this.choices,
        elapsedMs: this.challenge.timeLimitMs - this.remainingMs,
      },
      this.challenge.packets,
      gameConfig.scoring,
    )
    this.reportProgress(result.score)

    if (
      result.correctSteps === 3 &&
      Object.keys(this.choices).length === this.challenge.packets.length &&
      !this.completed
    ) {
      this.complete('completed', result.score)
    }
  }

  private reset(): void {
    if (this.completed) {
      return
    }
    this.sequence = []
    this.choices = {}
    this.pendingPacketId = null
    this.clearRoutes()
    useGameStore.getState().resetChallengeRoutes(this.challenge.id)
    if (this.textures.exists(imageKeys.before)) {
      this.currentImage.setTexture(imageKeys.before)
    }
    this.setFeedback('Start again: remove background, enhance, then style.')
    this.publishRaceProgress()
  }
}
