import { getMap } from '@mmorpg/shared';
import type { Player } from './Player';

export type MonsterAIState = 'idle' | 'chase' | 'attack' | 'return' | 'dead';

export interface MonsterDef {
  type: string;
  name: string;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number; // seconds
  aggroRange: number;
  leashRange: number; // max distance from spawn before returning
  respawnTime: number; // seconds
  color: number; // for client placeholder
}

export const MONSTER_TYPES: Record<string, MonsterDef> = {
  slime: {
    type: 'slime',
    name: 'Slime',
    maxHp: 40,
    speed: 70,
    damage: 5,
    attackRange: 36,
    attackCooldown: 1.4,
    aggroRange: 160,
    leashRange: 280,
    respawnTime: 12,
    color: 0x4ade80,
  },
  wolf: {
    type: 'wolf',
    name: 'Lobo',
    maxHp: 70,
    speed: 110,
    damage: 10,
    attackRange: 40,
    attackCooldown: 1.2,
    aggroRange: 200,
    leashRange: 320,
    respawnTime: 18,
    color: 0x94a3b8,
  },
  goblin: {
    type: 'goblin',
    name: 'Goblin',
    maxHp: 55,
    speed: 95,
    damage: 8,
    attackRange: 38,
    attackCooldown: 1.1,
    aggroRange: 180,
    leashRange: 300,
    respawnTime: 15,
    color: 0x22c55e,
  },
  spider: {
    type: 'spider',
    name: 'Aranha',
    maxHp: 90,
    speed: 120,
    damage: 14,
    attackRange: 36,
    attackCooldown: 1.0,
    aggroRange: 170,
    leashRange: 280,
    respawnTime: 20,
    color: 0x7c3aed,
  },
  skeleton: {
    type: 'skeleton',
    name: 'Esqueleto',
    maxHp: 120,
    speed: 85,
    damage: 16,
    attackRange: 40,
    attackCooldown: 1.1,
    aggroRange: 190,
    leashRange: 300,
    respawnTime: 22,
    color: 0xe7e5e4,
  },
  guardian: {
    type: 'guardian',
    name: 'Guardião de Pedra',
    maxHp: 450,
    speed: 70,
    damage: 28,
    attackRange: 48,
    attackCooldown: 1.5,
    aggroRange: 260,
    leashRange: 400,
    respawnTime: 90,
    color: 0xb45309,
  },
};

let nextMonsterId = 1;

export class Monster {
  id: string;
  type: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  aggroRange: number;
  leashRange: number;
  respawnTime: number;
  color: number;

  state: MonsterAIState = 'idle';
  targetId: string | null = null; // socket id of player
  attackTimer = 0;
  respawnTimer = 0;
  wanderTimer = 0;
  wanderTx = 0;
  wanderTy = 0;

  constructor(mapId: string, type: string, x: number, y: number) {
    const def = MONSTER_TYPES[type] || MONSTER_TYPES.slime;
    this.id = `m_${nextMonsterId++}`;
    this.type = def.type;
    this.name = def.name;
    this.mapId = mapId;
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.hp = def.maxHp;
    this.maxHp = def.maxHp;
    this.speed = def.speed;
    this.damage = def.damage;
    this.attackRange = def.attackRange;
    this.attackCooldown = def.attackCooldown;
    this.aggroRange = def.aggroRange;
    this.leashRange = def.leashRange;
    this.respawnTime = def.respawnTime;
    this.color = def.color;
    this.wanderTx = x;
    this.wanderTy = y;
  }

  distanceTo(px: number, py: number) {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceToSpawn() {
    return this.distanceTo(this.spawnX, this.spawnY);
  }

  /** Returns damage dealt to a player this frame (if any) */
  update(dt: number, players: Player[]): { targetId: string; damage: number } | null {
    if (this.state === 'dead') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return null;
    }

    this.attackTimer = Math.max(0, this.attackTimer - dt);

    // Find nearest player on same map within aggro
    let nearest: Player | null = null;
    let nearestDist = Infinity;

    for (const p of players) {
      if (p.mapId !== this.mapId) continue;
      const d = this.distanceTo(p.x, p.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    }

    // Leash check
    if (this.distanceToSpawn() > this.leashRange) {
      this.state = 'return';
      this.targetId = null;
    }

    let attackResult: { targetId: string; damage: number } | null = null;

    switch (this.state) {
      case 'idle': {
        // Wander a bit
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderTimer = 2 + Math.random() * 3;
          const angle = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 50;
          this.wanderTx = this.spawnX + Math.cos(angle) * dist;
          this.wanderTy = this.spawnY + Math.sin(angle) * dist;
        }
        this.moveToward(this.wanderTx, this.wanderTy, dt);

        if (nearest && nearestDist <= this.aggroRange) {
          this.state = 'chase';
          this.targetId = nearest.id;
        }
        break;
      }

      case 'chase': {
        const target = players.find((p) => p.id === this.targetId && p.mapId === this.mapId);
        if (!target || this.distanceTo(target.x, target.y) > this.aggroRange * 1.4) {
          this.state = 'return';
          this.targetId = null;
          break;
        }

        if (this.distanceTo(target.x, target.y) <= this.attackRange) {
          this.state = 'attack';
        } else {
          this.moveToward(target.x, target.y, dt);
        }
        break;
      }

      case 'attack': {
        const target = players.find((p) => p.id === this.targetId && p.mapId === this.mapId);
        if (!target) {
          this.state = 'return';
          this.targetId = null;
          break;
        }

        const d = this.distanceTo(target.x, target.y);
        if (d > this.attackRange * 1.3) {
          this.state = 'chase';
          break;
        }

        // Face target, attack on cooldown
        if (this.attackTimer <= 0) {
          this.attackTimer = this.attackCooldown;
          attackResult = { targetId: target.id, damage: this.damage };
        }
        break;
      }

      case 'return': {
        if (this.distanceToSpawn() < 16) {
          this.x = this.spawnX;
          this.y = this.spawnY;
          this.state = 'idle';
          this.hp = this.maxHp; // regenerate when returning
        } else {
          this.moveToward(this.spawnX, this.spawnY, dt * 1.2);
        }
        break;
      }
    }

    return attackResult;
  }

  private moveToward(tx: number, ty: number, dt: number) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const step = this.speed * dt;

    let newX = this.x + nx * step;
    let newY = this.y + ny * step;

    // Simple collision against map
    if (this.canMoveTo(newX, newY)) {
      this.x = newX;
      this.y = newY;
    } else {
      if (this.canMoveTo(newX, this.y)) this.x = newX;
      if (this.canMoveTo(this.x, newY)) this.y = newY;
    }
  }

  private canMoveTo(px: number, py: number): boolean {
    const map = getMap(this.mapId);
    const ts = map.tileSize;
    const half = 10;
    const points = [
      { x: px - half, y: py - half },
      { x: px + half, y: py - half },
      { x: px - half, y: py + half },
      { x: px + half, y: py + half },
    ];
    for (const p of points) {
      const tx = Math.floor(p.x / ts);
      const ty = Math.floor(p.y / ts);
      if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;
      if (map.collision[ty][tx]) return false;
    }
    return true;
  }

  takeDamage(amount: number): boolean {
    if (this.state === 'dead') return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.respawnTimer = this.respawnTime;
      this.targetId = null;
      return true; // died
    }
    // Aggro on attacker handled by caller
    return false;
  }

  private respawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.hp = this.maxHp;
    this.state = 'idle';
    this.targetId = null;
    this.attackTimer = 0;
  }

  toState() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      mapId: this.mapId,
      state: this.state,
    };
  }
}
