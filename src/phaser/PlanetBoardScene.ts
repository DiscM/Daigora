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
  private crisisText?: Phaser.GameObjects.Text;
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
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
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
    const centerY = height / 2 + Math.min(5, height * 0.015);
    const radius = Math.min(width * 0.39, height * 0.49);

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

  private drawAtmosphere(x: number, y: number, radius: number) {
    if (!this.atmosphere) return;
    this.atmosphere.clear();
    this.atmosphere.setDepth(7);
    this.atmosphere.lineStyle(Math.max(2, radius * 0.012), 0xf8ffdf, 0.28);
    this.atmosphere.strokeCircle(x, y, radius * 0.94);
    this.atmosphere.lineStyle(Math.max(8, radius * 0.04), 0xbde6ff, 0.13);
    this.atmosphere.strokeCircle(x, y, radius * 1.02);
    this.atmosphere.fillStyle(0xf6ffd6, 0.06);
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
      const start = Phaser.Math.DegToRad(218 + index * 23);
      const end = start + Phaser.Math.DegToRad(14 + value * 31);
      this.readinessLayer!.lineStyle(Math.max(3, radius * 0.012), colors[key], 0.32);
      this.readinessLayer!.beginPath();
      this.readinessLayer!.arc(x, y, radius * (1.06 + index * 0.024), start, end, false);
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
    this.crisisText.setText('');
    this.crisisText.setPosition(x, Math.max(24, y - radius - 22));
  }
}
