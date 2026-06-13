import Phaser from 'phaser';
import type { GameState, IndexKey } from '../game/types';

const INDEX_KEYS: IndexKey[] = ['trust', 'ecology', 'economy', 'coordination'];

export class PlanetBoardScene extends Phaser.Scene {
  private readonly initialState: GameState;
  private readonly planetUrl: string;
  private currentState: GameState;
  private planet?: Phaser.GameObjects.Image;
  private atmosphere?: Phaser.GameObjects.Graphics;
  private damageLayer?: Phaser.GameObjects.Graphics;
  private readinessLayer?: Phaser.GameObjects.Graphics;
  private starLayer?: Phaser.GameObjects.Graphics;
  private crisisText?: Phaser.GameObjects.Text;
  private aidContainer?: Phaser.GameObjects.Container;
  private ready = false;

  constructor(initialState: GameState, planetUrl: string) {
    super('PlanetBoardScene');
    this.initialState = initialState;
    this.currentState = initialState;
    this.planetUrl = planetUrl;
  }

  preload() {
    this.load.image('planet-watercolor', this.planetUrl);
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(11, 19, 38, 0)');
    this.starLayer = this.add.graphics();
    this.readinessLayer = this.add.graphics();
    this.atmosphere = this.add.graphics();
    this.damageLayer = this.add.graphics();
    this.planet = this.add.image(0, 0, 'planet-watercolor').setDepth(5);
    this.crisisText = this.add.text(0, 0, '', {
      fontFamily: 'Avenir Next, Nunito Sans, sans-serif',
      fontSize: '14px',
      fontStyle: '700',
      color: '#fff8df',
      align: 'center',
      shadow: { offsetX: 0, offsetY: 2, color: '#0b1326', blur: 4, fill: true },
    }).setOrigin(0.5).setDepth(20);
    this.aidContainer = this.add.container(0, 0).setDepth(30);

    this.tweens.add({
      targets: this.planet,
      y: '+=10',
      angle: 1.2,
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.scale.on('resize', () => this.redraw());
    this.input.on('pointerdown', () => {
      this.cameras.main.flash(120, 180, 226, 255, false);
    });
    this.ready = true;
    this.sync(this.initialState);
  }

  sync(state: GameState) {
    this.currentState = state;
    if (this.ready) this.redraw();
  }

  private redraw() {
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const centerY = height / 2 + Math.min(18, height * 0.04);
    const radius = Math.min(width * 0.35, height * 0.43);

    this.drawStars();

    if (this.planet) {
      const sourceSize = Math.max(this.planet.width, this.planet.height) || 1024;
      this.planet.setPosition(centerX, centerY);
      this.planet.setScale((radius * 2) / sourceSize);
    }

    this.drawAtmosphere(centerX, centerY, radius);
    this.drawReadiness(centerX, centerY, radius);
    this.drawDamage(centerX, centerY, radius);
    this.drawCrisisLabel(centerX, centerY, radius);
  }

  private drawStars() {
    if (!this.starLayer) return;
    this.starLayer.clear();
  }

  private drawAtmosphere(x: number, y: number, radius: number) {
    if (!this.atmosphere) return;
    this.atmosphere.clear();
    this.atmosphere.setDepth(7);
    this.atmosphere.lineStyle(Math.max(2, radius * 0.012), 0xd8f5ff, 0.5);
    this.atmosphere.strokeCircle(x, y, radius * 0.94);
    this.atmosphere.lineStyle(Math.max(7, radius * 0.035), 0x8bd2ff, 0.16);
    this.atmosphere.strokeCircle(x, y, radius * 1.02);
    this.atmosphere.fillStyle(0xb7e9ff, 0.08);
    this.atmosphere.fillCircle(x, y, radius * 1.05);
  }

  private drawReadiness(x: number, y: number, radius: number) {
    if (!this.readinessLayer) return;
    this.readinessLayer.clear();
    this.readinessLayer.setDepth(3);
    const colors: Record<IndexKey, number> = {
      trust: 0xf7c86c,
      ecology: 0xa5d86b,
      economy: 0x7fc8c2,
      coordination: 0xd9a3cf,
    };
    INDEX_KEYS.forEach((key, index) => {
      const value = this.currentState.indexes[key] / 10;
      const start = Phaser.Math.DegToRad(212 + index * 24);
      const end = start + Phaser.Math.DegToRad(18 + value * 34);
      this.readinessLayer!.lineStyle(Math.max(3, radius * 0.014), colors[key], 0.36);
      this.readinessLayer!.beginPath();
      this.readinessLayer!.arc(x, y, radius * (1.11 + index * 0.025), start, end, false);
      this.readinessLayer!.strokePath();
    });
  }

  private drawDamage(x: number, y: number, radius: number) {
    if (!this.damageLayer) return;
    this.damageLayer.clear();
    this.damageLayer.setDepth(9);
    const lostRatio = 1 - this.currentState.planetHealth / this.currentState.maxPlanetHealth;
    if (lostRatio <= 0.05) return;
    this.damageLayer.fillStyle(0x8f4b35, 0.13 + lostRatio * 0.2);
    this.damageLayer.fillEllipse(x - radius * 0.28, y - radius * 0.15, radius * 0.38, radius * 0.18);
    this.damageLayer.fillStyle(0xc86b4c, 0.08 + lostRatio * 0.15);
    this.damageLayer.fillEllipse(x + radius * 0.32, y + radius * 0.16, radius * 0.28, radius * 0.15);
  }

  private drawCrisisLabel(x: number, y: number, radius: number) {
    if (!this.crisisText) return;
    const phase = this.currentState.phase === 'gameOver' ? this.currentState.finalRating ?? 'Game Over' : '';
    this.crisisText.setText(phase);
    this.crisisText.setPosition(x, Math.max(24, y - radius - 22));
  }

  private drawAidTokens(width: number, height: number) {
    if (!this.aidContainer) return;
    this.aidContainer.removeAll(true);
    const names = this.currentState.selectedAidIds.map((id) => {
      if (id === 'disaster-responder') return 'Responder';
      return id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' ');
    });
    const startX = 32;
    const y = height - 36;
    names.forEach((name, index) => {
      const label = this.add.text(startX + index * 118, y, name, {
        fontFamily: 'Avenir Next, Nunito Sans, sans-serif',
        fontSize: '16px',
        fontStyle: '800',
        color: '#2f6a50',
        backgroundColor: 'rgba(255, 248, 224, 0.86)',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      }).setOrigin(0, 0.5);
      this.aidContainer!.add(label);
    });
  }
}
