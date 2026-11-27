import Phaser from 'phaser'
import { addBackdrop, addLabel, COLORS, GAME_WIDTH } from './theme'
import { SCENE_KEYS } from './BootScene'

interface LaneSpec {
  x: number
  color: number
  name: string
  tag: string
  caption: string
}

const lanes: LaneSpec[] = [
  {
    x: 40,
    color: COLORS.rival,
    name: 'WITHOUT NPU ROUTING',
    tag: 'CPU OR GPU ONLY',
    caption: 'Same tasks. One lane stays on general-purpose engines.',
  },
  {
    x: 660,
    color: COLORS.electric,
    name: 'WITH NPU ROUTING',
    tag: 'SUPPORTED TASKS USE THE NPU',
    caption: 'Same tasks. This lane routes each packet where it fits.',
  },
]

export class RaceSetupScene extends Phaser.Scene {
  private tweensToStop: Phaser.Tweens.Tween[] = []

  constructor() {
    super(SCENE_KEYS.setup)
  }

  create(): void {
    addBackdrop(this)

    addLabel(this, GAME_WIDTH / 2, 110, 'YOUR CHOICES DECIDE WHO WINS.', {
      size: 40,
      display: true,
      origin: 0.5,
      color: COLORS.cyan,
    })

    for (const lane of lanes) {
      const card = this.add
        .rectangle(lane.x, 176, 580, 400, COLORS.navySoft, 0.72)
        .setOrigin(0, 0)
        .setStrokeStyle(1, COLORS.muted, 0.28)

      addLabel(this, lane.x + 24, 200, lane.name, {
        size: 22,
        display: true,
        color: lane.color,
      })
      addLabel(this, lane.x + 24, 236, lane.tag, {
        size: 14,
        color: COLORS.muted,
      })

      const trackY = 382
      this.add.rectangle(lane.x + 24, trackY, 532, 3, COLORS.muted, 0.28).setOrigin(0, 0.5)
      this.add
        .rectangle(lane.x + 552, trackY - 26, 3, 52, COLORS.cyan, 0.9)
        .setOrigin(0, 0.5)

      for (let index = 0; index < 3; index += 1) {
        const packet = this.add.rectangle(
          lane.x + 30,
          trackY,
          18,
          18,
          lane.color,
        )
        const tween = this.tweens.add({
          targets: packet,
          x: lane.x + 548,
          duration: 2800,
          repeat: -1,
          delay: index * 900,
          ease: 'Linear',
        })
        this.tweensToStop.push(tween)
      }

      addLabel(this, lane.x + 24, 482, lane.caption, {
        size: 20,
        width: 520,
      })

      card.setDepth(-1)
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)
  }

  private cleanup(): void {
    for (const tween of this.tweensToStop) {
      tween.stop()
    }
    this.tweensToStop = []
    this.tweens.killAll()
  }
}
