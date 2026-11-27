import { gameConfig } from '../config/loadConfig'
import { scorePrivacyShield } from '../scoring/privacyShield'
import { ChallengeScene } from './ChallengeScene'
import { SCENE_KEYS } from './BootScene'
import { addLabel, COLORS } from './theme'
import type { ProcessingChoice } from '../scoring/privacyShield'

export class PrivacyShieldScene extends ChallengeScene {
  private choice: ProcessingChoice | null = null
  private leakChoice: string | null = null

  constructor() {
    super(SCENE_KEYS.privacyShield)
  }

  protected create(): void {
    super.create()

    this.add
      .rectangle(640, 142, 560, 92, COLORS.navySoft, 1)
      .setStrokeStyle(2, COLORS.electric, 0.7)
    addLabel(this, 640, 118, 'CONFIDENTIAL CONTRACT', {
      size: 22,
      display: true,
      origin: 0.5,
      color: COLORS.cyan,
    })
    addLabel(this, 640, 154, 'Fictional sample document', {
      size: 18,
      origin: 0.5,
      color: COLORS.muted,
    })

    this.createRoutePanel(340, 288, 'PROCESS ON THIS DEVICE', COLORS.success, 'local')
    this.createRoutePanel(940, 288, 'PROCESS IN THE CLOUD', COLORS.rival, 'cloud')

    const followUp = this.challenge.followUp
    if (followUp) {
      addLabel(this, 640, 392, followUp.prompt, {
        size: 18,
        origin: 0.5,
        color: COLORS.muted,
      })
      followUp.options.forEach((option, index) => {
        const chip = this.drawPacketChip(
          440 + index * 400,
          460,
          option.label,
          false,
        )
        chip.on('pointerdown', () => this.onLeakChoice(option.id))
      })
    }
  }

  private createRoutePanel(
    x: number,
    y: number,
    label: string,
    color: number,
    choice: ProcessingChoice,
  ): void {
    const panel = this.add
      .rectangle(x, y, 480, 110, COLORS.navySoft, 1)
      .setStrokeStyle(2, color)
      .setInteractive({ useHandCursor: true })
    addLabel(this, x, y, label, {
      size: 20,
      display: true,
      origin: 0.5,
      color,
    })
    panel.on('pointerdown', () => this.onRouteChoice(choice, x, y, color))
  }

  private onRouteChoice(
    choice: ProcessingChoice,
    targetX: number,
    targetY: number,
    color: number,
  ): void {
    if (this.choice || this.completed) {
      return
    }
    this.choice = choice

    const document = this.add.rectangle(640, 142, 120, 24, COLORS.cyan, 1)
    const lock = this.add.container(targetX === 340 ? 640 : -100, 142)
    lock.add(this.add.rectangle(0, 8, 34, 28, COLORS.success, 1))
    lock.add(this.add.circle(0, -10, 11, COLORS.success, 0).setStrokeStyle(4, COLORS.success))

    this.tweens.add({
      targets: document,
      x: targetX,
      y: targetY,
      duration: 520,
      ease: 'Cubic.easeInOut',
      onComplete: () => document.destroy(),
    })

    if (choice === 'local') {
      this.tweens.add({
        targets: lock,
        x: targetX,
        y: targetY,
        duration: 520,
        ease: 'Cubic.easeInOut',
      })
    }

    this.routePacket('confidential-document', choice === 'local' ? 'NPU' : 'CPU')
    this.setFeedback(
      choice === 'local'
        ? 'The document stays on this device. Check the app settings.'
        : 'The document leaves this device for a cloud service.',
      choice === 'local' ? COLORS.success : color,
    )
    this.reportProgress(this.currentScore())
  }

  private onLeakChoice(optionId: string): void {
    if (!this.choice || this.leakChoice || this.completed) {
      return
    }
    this.leakChoice = optionId
    this.reportProgress(this.currentScore())
    this.complete('completed', this.currentScore())
  }

  private currentScore(): number {
    return scorePrivacyShield(
      {
        choice: this.choice ?? 'cloud',
        leakChoice: this.leakChoice,
        correctLeakId: this.challenge.followUp?.correctId ?? 'app-settings',
        elapsedMs: this.challenge.timeLimitMs - this.remainingMs,
      },
      gameConfig.scoring,
    )
  }
}
