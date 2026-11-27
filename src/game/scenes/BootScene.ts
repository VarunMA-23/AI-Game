import Phaser from 'phaser'
import { addBackdrop, addLabel, COLORS, GAME_HEIGHT, GAME_WIDTH } from './theme'

export const SCENE_KEYS = {
  boot: 'Boot',
  setup: 'RaceSetup',
  finish: 'RaceFinish',
  studySprint: 'StudySprint',
  creatorMode: 'CreatorMode',
  privacyShield: 'PrivacyShield',
  streamNight: 'StreamNight',
  batteryEscape: 'BatteryEscape',
} as const

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot)
  }

  preload(): void {
    this.load.image('creator-before', 'images/creator-before.svg')
    this.load.image('creator-removed', 'images/creator-removed.svg')
    this.load.image('creator-enhanced', 'images/creator-enhanced.svg')
    this.load.image('creator-styled', 'images/creator-styled.svg')
  }

  create(): void {
    addBackdrop(this)
    addLabel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LOADING', {
      size: 28,
      display: true,
      color: COLORS.cyan,
      origin: 0.5,
    })
    this.scene.start(SCENE_KEYS.setup)
  }
}
