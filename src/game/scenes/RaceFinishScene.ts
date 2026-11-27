import Phaser from 'phaser'
import { useGameStore } from '../../store/gameStore'
import { addBackdrop, addLabel, COLORS, GAME_WIDTH } from './theme'
import { SCENE_KEYS } from './BootScene'

export class RaceFinishScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.finish)
  }

  create(): void {
    addBackdrop(this)

    const race = useGameStore.getState().race
    const winner =
      race.rightProgress > race.leftProgress
        ? 'RIGHT LANE AHEAD'
        : race.leftProgress > race.rightProgress
          ? 'LEFT LANE AHEAD'
          : 'LANES LEVEL'

    addLabel(this, GAME_WIDTH / 2, 96, 'RACE FINISH', {
      size: 46,
      display: true,
      origin: 0.5,
      color: COLORS.cyan,
    })
    addLabel(this, GAME_WIDTH / 2, 168, winner, {
      size: 26,
      display: true,
      origin: 0.5,
    })

    const lanes = [
      { y: 290, label: 'WITHOUT NPU ROUTING', color: COLORS.rival, value: race.leftProgress },
      { y: 410, label: 'WITH NPU ROUTING', color: COLORS.electric, value: race.rightProgress },
    ]

    for (const lane of lanes) {
      addLabel(this, 120, lane.y - 34, lane.label, {
        size: 20,
        display: true,
        color: lane.color,
      })
      this.add.rectangle(120, lane.y, 1040, 18, COLORS.navySoft).setOrigin(0, 0.5)
      const bar = this.add
        .rectangle(120, lane.y, 0, 18, lane.color)
        .setOrigin(0, 0.5)
      this.tweens.add({
        targets: bar,
        displayWidth: 1040 * lane.value,
        duration: 900,
        ease: 'Cubic.easeOut',
      })
      this.add.rectangle(1160, lane.y, 4, 60, COLORS.cyan, 0.9)
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.tweens.killAll())
  }
}
