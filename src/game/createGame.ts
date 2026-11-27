import Phaser from 'phaser'
import { useGameStore } from '../store/gameStore'
import type { ShowSegmentPayload } from '../types/game'
import { getChallengeByIndex } from './config/loadConfig'
import {
  BootScene,
  SCENE_KEYS,
} from './scenes/BootScene'
import { RaceFinishScene } from './scenes/RaceFinishScene'
import { RaceSetupScene } from './scenes/RaceSetupScene'
import { StudySprintScene } from './scenes/StudySprintScene'
import { CreatorModeScene } from './scenes/CreatorModeScene'
import { PrivacyShieldScene } from './scenes/PrivacyShieldScene'
import { StreamNightScene } from './scenes/StreamNightScene'
import { BatteryEscapeScene } from './scenes/BatteryEscapeScene'
import { GAME_HEIGHT, GAME_WIDTH } from './scenes/theme'

let game: Phaser.Game | null = null
let pending: ShowSegmentPayload | null = null

const sceneKeyFor = (payload: ShowSegmentPayload): string | null => {
  if (payload.phase === 'setup') {
    return SCENE_KEYS.setup
  }
  if (payload.phase === 'race-finish') {
    return SCENE_KEYS.finish
  }
  if (payload.phase !== 'challenges') {
    return null
  }

  const challengeId = getChallengeByIndex(payload.challengeIndex)?.id
  if (!challengeId) {
    return null
  }

  const keys: Record<string, string> = {
    'study-sprint': SCENE_KEYS.studySprint,
    'creator-mode': SCENE_KEYS.creatorMode,
    'privacy-shield': SCENE_KEYS.privacyShield,
    'stream-night': SCENE_KEYS.streamNight,
    'battery-escape': SCENE_KEYS.batteryEscape,
  }
  return keys[challengeId] ?? null
}

export const createGame = (parent: HTMLElement): Phaser.Game => {
  if (game) {
    return game
  }

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#f8fafc',
    banner: false,
    audio: { noAudio: true },
    input: { activePointers: 3 },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      BootScene,
      RaceSetupScene,
      StudySprintScene,
      CreatorModeScene,
      PrivacyShieldScene,
      StreamNightScene,
      BatteryEscapeScene,
      RaceFinishScene,
    ],
  })

  game.events.once(Phaser.Core.Events.READY, () => {
    if (pending) {
      showGameSegment(pending)
      pending = null
    }
  })

  return game
}

export const showGameSegment = (payload: ShowSegmentPayload): void => {
  if (!game || !game.scene || !game.isBooted) {
    pending = payload
    return
  }

  const target = sceneKeyFor(payload)
  const active = game.scene
    .getScenes(true)
    .map((scene) => scene.scene.key)

  if (!target) {
    for (const key of active) {
      game.scene.stop(key)
    }
    return
  }

  if (active.length === 1 && active[0] === target) {
    return
  }

  for (const key of active) {
    if (key !== target) {
      game.scene.stop(key)
    }
  }

  if (!active.includes(target)) {
    const challengeId =
      payload.phase === 'challenges'
        ? getChallengeByIndex(payload.challengeIndex)?.id
        : undefined
    game.scene.start(target, challengeId ? { challengeId } : undefined)
  }
}

export const destroyGame = (): void => {
  if (!game) {
    return
  }
  game.destroy(true)
  game = null
  pending = null
  useGameStore.getState().setRemainingMs(0)
}
