export interface EnemyTemplate {
  name: string;
  level: number;
  maxHp: number;
  damage: number;
  xpReward: number;
  attackRange: number;
  aggroRange: number;
  attackIntervalMs: number;
  color: number;
}

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  slime: {
    name: "Geleca Verde", level: 1, maxHp: 40, damage: 4, xpReward: 12,
    attackRange: 40, aggroRange: 120, attackIntervalMs: 1500, color: 0x55dd55,
  },
  wolf: {
    name: "Lobo Cinzento", level: 3, maxHp: 70, damage: 8, xpReward: 25,
    attackRange: 45, aggroRange: 160, attackIntervalMs: 1200, color: 0x999999,
  },
};

// Cada entrada spawna um inimigo em uma posição fixa do mapa.
export const ENEMY_SPAWNS: { id: string; template: keyof typeof ENEMY_TEMPLATES; x: number; y: number }[] = [
  { id: "slime-1", template: "slime", x: 150, y: 150 },
  { id: "slime-2", template: "slime", x: 650, y: 150 },
  { id: "slime-3", template: "slime", x: 150, y: 450 },
  { id: "wolf-1", template: "wolf", x: 650, y: 450 },
  { id: "wolf-2", template: "wolf", x: 400, y: 500 },
];

export const RESPAWN_DELAY_MS = 15000;
