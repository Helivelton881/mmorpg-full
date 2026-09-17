import Phaser from 'phaser';
import { MonsterState } from '@mmorpg/shared';

const TYPE_COLORS: Record<string, number> = {
  slime: 0x4ade80,
  wolf: 0x94a3b8,
  goblin: 0x22c55e,
  spider: 0x7c3aed,
  skeleton: 0xe7e5e4,
  guardian: 0xb45309,
};

export class MonsterEntity {
  id: string;
  type: string;
  name: string;
  sprite: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  state: string;

  constructor(scene: Phaser.Scene, state: MonsterState) {
    this.id = state.id;
    this.type = state.type;
    this.name = state.name;
    this.targetX = state.x;
    this.targetY = state.y;
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.state = state.state;

    const color = TYPE_COLORS[state.type] || 0xef4444;
    const size =
      state.type === 'guardian' ? 48 :
      state.type === 'skeleton' ? 28 :
      state.type === 'spider' ? 30 :
      state.type === 'wolf' ? 28 : 24;

    this.sprite = scene.add.rectangle(state.x, state.y, size, size, color);
    this.sprite.setStrokeStyle(2, 0x000000, 0.4);
    this.sprite.setDepth(9);

    this.nameText = scene.add.text(state.x, state.y - 22, state.name, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#fecaca',
      backgroundColor: '#000000aa',
      padding: { x: 3, y: 1 },
    });
    this.nameText.setOrigin(0.5, 1);
    this.nameText.setDepth(11);

    this.hpBarBg = scene.add.rectangle(state.x, state.y - 26, 28, 4, 0x3f1a1a);
    this.hpBarBg.setDepth(11);
    this.hpBar = scene.add.rectangle(state.x - 14, state.y - 26, 28, 4, 0xef4444);
    this.hpBar.setOrigin(0, 0.5);
    this.hpBar.setDepth(12);
  }

  applyState(state: MonsterState) {
    this.targetX = state.x;
    this.targetY = state.y;
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.state = state.state;

    if (state.state === 'dead') {
      this.sprite.setAlpha(0.25);
      this.nameText.setAlpha(0.25);
      this.hpBar.setVisible(false);
      this.hpBarBg.setVisible(false);
    } else {
      this.sprite.setAlpha(1);
      this.nameText.setAlpha(1);
      this.hpBar.setVisible(true);
      this.hpBarBg.setVisible(true);
    }
  }

  update(dt: number) {
    const lerp = Math.min(1, 12 * dt);
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, lerp);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, lerp);

    this.nameText.x = this.sprite.x;
    this.nameText.y = this.sprite.y - 22;

    this.hpBarBg.x = this.sprite.x;
    this.hpBarBg.y = this.sprite.y - 26;

    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    this.hpBar.x = this.sprite.x - 14;
    this.hpBar.y = this.sprite.y - 26;
    this.hpBar.width = 28 * Math.max(0, ratio);
  }

  destroy() {
    this.sprite.destroy();
    this.nameText.destroy();
    this.hpBarBg.destroy();
    this.hpBar.destroy();
  }
}
