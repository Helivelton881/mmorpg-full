import Phaser from 'phaser';

export type CharacterClass =
  | 'guerreiro' | 'arqueiro' | 'mago' | 'clerigo' | 'paladino'
  | 'ladino' | 'barbaro' | 'monge' | 'necromante';

export class PlayerEntity {
  id: string;
  name: string;
  className: CharacterClass;
  sprite: Phaser.GameObjects.Image;
  nameText: Phaser.GameObjects.Text;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  targetX: number;
  targetY: number;
  isLocal: boolean;
  hp = 100;
  maxHp = 100;
  alive = true;
  private currentDirection: string = 'down';
  private isMoving = false;

  constructor(
    scene: Phaser.Scene,
    id: string,
    name: string,
    x: number,
    y: number,
    isLocal = false,
    className: CharacterClass = 'guerreiro'
  ) {
    this.id = id;
    this.name = name;
    this.className = className;
    this.targetX = x;
    this.targetY = y;
    this.isLocal = isLocal;

    const textureKey = `char_${className}`;
    this.sprite = scene.add.image(x, y, textureKey);
    this.sprite.setDisplaySize(48, 48);
    this.sprite.setDepth(10);
    if (isLocal) this.sprite.setScale(1.08);

    this.nameText = scene.add.text(x, y - 36, name, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: isLocal ? '#4ade80' : '#e2e8f0',
      backgroundColor: '#000000cc',
      padding: { x: 4, y: 2 },
    });
    this.nameText.setOrigin(0.5, 1);
    this.nameText.setDepth(11);

    this.hpBarBg = scene.add.rectangle(x, y - 42, 36, 5, 0x3f1a1a);
    this.hpBarBg.setDepth(11);
    this.hpBar = scene.add.rectangle(x - 18, y - 42, 36, 5, 0x22c55e);
    this.hpBar.setOrigin(0, 0.5);
    this.hpBar.setDepth(12);
  }

  setTarget(x: number, y: number, direction?: string) {
    this.targetX = x;
    this.targetY = y;
    if (direction && direction !== 'none') this.currentDirection = direction;
  }

  setName(name: string) {
    this.name = name;
    this.nameText.setText(name);
  }

  setHp(hp: number, maxHp: number) {
    this.hp = hp;
    this.maxHp = maxHp;
    const ratio = maxHp > 0 ? Math.max(0, hp / maxHp) : 0;
    this.hpBar.width = 36 * ratio;
    if (ratio > 0.5) this.hpBar.setFillStyle(0x22c55e);
    else if (ratio > 0.25) this.hpBar.setFillStyle(0xeab308);
    else this.hpBar.setFillStyle(0xef4444);
  }

  setAlive(alive: boolean) {
    this.alive = alive;
    this.sprite.setAlpha(alive ? 1 : 0.35);
    this.nameText.setAlpha(alive ? 1 : 0.35);
    this.hpBar.setVisible(alive);
    this.hpBarBg.setVisible(alive);
  }

  update(dt: number) {
    const lerpFactor = Math.min(1, 14 * dt);
    const prevX = this.sprite.x;
    const prevY = this.sprite.y;

    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, lerpFactor);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, lerpFactor);

    const moved =
      Math.abs(this.sprite.x - prevX) > 0.3 || Math.abs(this.sprite.y - prevY) > 0.3;
    this.isMoving = moved;

    const bob = this.isMoving && this.alive ? Math.sin(Date.now() / 90) * 1.8 : 0;
    this.sprite.y += bob;

    if (this.currentDirection === 'left') this.sprite.setFlipX(true);
    else if (this.currentDirection === 'right') this.sprite.setFlipX(false);

    this.nameText.x = this.sprite.x;
    this.nameText.y = this.sprite.y - 36 + bob;
    this.hpBarBg.x = this.sprite.x;
    this.hpBarBg.y = this.sprite.y - 42 + bob;
    this.hpBar.x = this.sprite.x - 18;
    this.hpBar.y = this.sprite.y - 42 + bob;
  }

  destroy() {
    this.sprite.destroy();
    this.nameText.destroy();
    this.hpBarBg.destroy();
    this.hpBar.destroy();
  }
}
