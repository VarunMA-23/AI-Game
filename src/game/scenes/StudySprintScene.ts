import Phaser from 'phaser'
import { gameConfig } from '../config/loadConfig'
import { scoreStudySprint } from '../scoring/studySprint'
import { ChallengeScene } from './ChallengeScene'
import { SCENE_KEYS } from './BootScene'
import { addLabel, COLORS } from './theme'
import type { ConceptOption } from '../../types/game'

interface Chip {
  option: ConceptOption
  container: Phaser.GameObjects.Container
  home: { x: number; y: number }
  placed: boolean
}

const trayBounds = new Phaser.Geom.Rectangle(20, 356, 1240, 76)

export class StudySprintScene extends ChallengeScene {
  private chips: Chip[] = []
  private summaryScore = 0
  private summaryComplete = false

  constructor() {
    super(SCENE_KEYS.studySprint)
  }

  protected create(): void {
    super.create()

    const concepts = this.challenge.concepts ?? []
    addLabel(this, 40, 146, 'DRAG FIVE KEY CONCEPTS INTO THE SUMMARY TRAY', {
      size: 18,
      color: COLORS.muted,
    })
    addLabel(this, 40, 336, 'DEMO CONTENT — PRECOMPUTED SUMMARY', {
      size: 14,
      color: COLORS.cyan,
    })

    this.add.rectangle(640, 394, 1240, 76, COLORS.navySoft, 0.8)
    this.add
      .rectangle(640, 394, 1240, 76, COLORS.navySoft, 0)
      .setStrokeStyle(2, COLORS.electric, 0.6)

    this.input.on('drag', this.onDrag, this)
    this.input.on('dragend', this.onDragEnd, this)
    this.registerCleanup(() => {
      this.input.off('drag', this.onDrag, this)
      this.input.off('dragend', this.onDragEnd, this)
    })

    concepts.forEach((option, index) => {
      const home = {
        x: 180 + (index % 5) * 224,
        y: 206 + Math.floor(index / 5) * 96,
      }
      const width = Math.max(160, option.label.length * 11 + 38)
      const background = this.add
        .rectangle(0, 0, width, 88, COLORS.navySoft, 1)
        .setStrokeStyle(2, COLORS.intel)
      const text = this.add
        .text(0, 0, option.label, {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '17px',
          color: '#0f172a',
        })
        .setOrigin(0.5)
      const container = this.add.container(home.x, home.y, [background, text])
      container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2, -44, width, 88),
        Phaser.Geom.Rectangle.Contains,
      )
      this.input.setDraggable(container)
      this.chips.push({ option, container, home, placed: false })
    })
  }

  private onDrag(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
    dragX: number,
    dragY: number,
  ): void {
    ;(gameObject as Phaser.GameObjects.Container).setPosition(dragX, dragY)
  }

  private onDragEnd(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
  ): void {
    const chip = this.chips.find(
      (item) => item.container === (gameObject as Phaser.GameObjects.Container),
    )
    if (!chip || this.completed) {
      return
    }

    const insideTray = Phaser.Geom.Rectangle.Contains(
      trayBounds,
      chip.container.x,
      chip.container.y,
    )
    const placedCount = this.chips.filter((item) => item.placed).length

    if (insideTray && !chip.placed && placedCount < 5) {
      chip.placed = true
      this.tweens.add({
        targets: chip.container,
        x: 170 + placedCount * 224,
        y: 394,
        duration: 160,
      })
    } else if (!insideTray && chip.placed) {
      chip.placed = false
      this.tweens.add({
        targets: chip.container,
        x: chip.home.x,
        y: chip.home.y,
        duration: 160,
      })
    } else {
      const target = chip.placed
        ? { x: chip.container.x, y: 394 }
        : chip.home
      this.tweens.add({
        targets: chip.container,
        x: target.x,
        y: target.y,
        duration: 160,
      })
    }

    this.updateScore()
  }

  private updateScore(): void {
    const placed = this.chips.filter((chip) => chip.placed)
    const correct = placed.filter((chip) => chip.option.correct).length
    const incorrect = placed.length - correct
    const elapsedMs = this.challenge.timeLimitMs - this.remainingMs

    this.summaryScore = scoreStudySprint(
      {
        correct,
        incorrect,
        elapsedMs,
        completed: placed.length === 5,
      },
      gameConfig.scoring,
    )
    this.reportProgress(this.summaryScore)

    if (placed.length === 5 && !this.summaryComplete) {
      this.summaryComplete = true
      this.setFeedback('Summary ready. Where should this task run?', COLORS.cyan)
      this.createEngineButtons('Route the notes summary packet', (engine) => {
        this.routePacket('notes-summary', engine)
        this.complete('completed', this.summaryScore)
      })
    }
  }
}
