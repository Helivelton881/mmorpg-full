import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { InputPayload } from '@mmorpg/shared';

export class World {
  players = new Map<string, Player>();
  monsters = new Map<string, Monster>();

  constructor() {
    this.spawnInitialMonsters();
  }

  private spawnInitialMonsters() {
    const starterSpawns = [
      { type: 'slime', x: 700, y: 500 },
      { type: 'slime', x: 850, y: 350 },
      { type: 'slime', x: 600, y: 700 },
      { type: 'slime', x: 900, y: 600 },
    ];
    for (const s of starterSpawns) {
      const m = new Monster('starter', s.type, s.x, s.y);
      this.monsters.set(m.id, m);
    }

    const fieldSpawns = [
      { type: 'wolf', x: 400, y: 400 },
      { type: 'wolf', x: 800, y: 600 },
      { type: 'wolf', x: 1100, y: 450 },
      { type: 'slime', x: 500, y: 800 },
      { type: 'slime', x: 1000, y: 300 },
      { type: 'slime', x: 700, y: 900 },
    ];
    for (const s of fieldSpawns) {
      const m = new Monster('field', s.type, s.x, s.y);
      this.monsters.set(m.id, m);
    }

    const forestSpawns = [
      { type: 'goblin', x: 400, y: 500 },
      { type: 'goblin', x: 600, y: 350 },
      { type: 'goblin', x: 900, y: 700 },
      { type: 'goblin', x: 1100, y: 450 },
      { type: 'spider', x: 700, y: 800 },
      { type: 'spider', x: 1000, y: 550 },
      { type: 'spider', x: 500, y: 900 },
    ];
    for (const s of forestSpawns) {
      const m = new Monster('forest', s.type, s.x, s.y);
      this.monsters.set(m.id, m);
    }

    console.log(`[World] Spawned ${this.monsters.size} monsters`);
  }

  addPlayer(
    socketId: string,
    characterId: string,
    name: string,
    className: string,
    x: number,
    y: number,
    mapId = 'starter',
    level = 1,
    experience = 0,
    gold = 50,
    inventory: Array<{ itemId: string; quantity: number }> = [],
    equipment: { weapon: string | null; armor: string | null } = { weapon: null, armor: null },
    questLog: any[] = []
  ): Player {
    const player = new Player(
      socketId, characterId, name, className, x, y, mapId, level, experience,
      gold, inventory, equipment, questLog
    );
    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId: string) {
    this.players.delete(socketId);
  }

  getPlayer(socketId: string): Player | undefined {
    return this.players.get(socketId);
  }

  setInput(socketId: string, input: InputPayload) {
    const player = this.players.get(socketId);
    if (player) player.setInput(input);
  }

  update(dt: number, duelTargets?: Map<string, string>): {
    transfers: Array<{ socketId: string; mapId: string; x: number; y: number }>;
    monsterAttacks: Array<{ monsterId: string; targetId: string; damage: number; killed: boolean; targetHp: number; targetMaxHp: number }>;
    playerAttacks: Array<{ attackerId: string; targetId: string; damage: number; killed: boolean; targetHp: number; targetMaxHp: number; xpGained?: number; levelUp?: { level: number; experience: number; maxHp: number; maxMp: number } }>;
    playerDeaths: string[];
    playerRespawns: string[];
    pvpAttacks: Array<{ attackerId: string; targetId: string; damage: number; killed: boolean; targetHp: number; targetMaxHp: number }>;
  } {
    const transfers: Array<{ socketId: string; mapId: string; x: number; y: number }> = [];
    const monsterAttacks: Array<{ monsterId: string; targetId: string; damage: number; killed: boolean; targetHp: number; targetMaxHp: number }> = [];
    const playerAttacks: Array<{ attackerId: string; targetId: string; damage: number; killed: boolean; targetHp: number; targetMaxHp: number; xpGained?: number; levelUp?: any }> = [];
    const playerDeaths: string[] = [];
    const playerRespawns: string[] = [];
    const pvpAttacks: Array<{ attackerId: string; targetId: string; damage: number; killed: boolean; targetHp: number; targetMaxHp: number }> = [];

    const wasDead = new Set<string>();
    for (const [id, p] of this.players) {
      if (!p.alive) wasDead.add(id);
    }

    for (const [socketId, player] of this.players) {
      const transfer = player.update(dt);
      if (transfer) {
        player.mapId = transfer.mapId;
        player.x = transfer.x;
        player.y = transfer.y;
        transfers.push({ socketId, ...transfer });
      }
    }

    for (const [id, p] of this.players) {
      if (wasDead.has(id) && p.alive) {
        playerRespawns.push(id);
      }
    }

    const monsterList = Array.from(this.monsters.values());
    for (const [socketId, player] of this.players) {
      const result = player.tryAttack(monsterList);
      if (result) {
        let xpGained = 0;
        let levelUp = undefined;
        if (result.killed) {
          const m = this.monsters.get(result.targetId);
          xpGained =
              m?.type === 'guardian' ? 200 :
              m?.type === 'skeleton' ? 40 :
              m?.type === 'spider' ? 35 :
              m?.type === 'wolf' ? 25 :
              m?.type === 'goblin' ? 18 : 12;
          const lvl = player.addExperience(xpGained);
          if (lvl.leveled) {
            levelUp = {
              level: player.level,
              experience: player.experience,
              maxHp: player.maxHp,
              maxMp: player.maxMp,
            };
          }
          if (m) {
            player.applyDrops(m.type);
            player.onKill(m.type);
            player.syncCollectObjectives();
          }
        }
        playerAttacks.push({
          attackerId: socketId,
          targetId: result.targetId,
          damage: result.damage,
          killed: result.killed,
          targetHp: result.targetHp,
          targetMaxHp: result.targetMaxHp,
          xpGained,
          levelUp,
        });
      } else if (duelTargets) {
        const oppId = duelTargets.get(socketId);
        if (oppId) {
          const opp = this.players.get(oppId);
          if (opp && opp.alive && opp.mapId === player.mapId) {
            const pvp = player.tryAttackPlayer(opp);
            if (pvp) {
              pvpAttacks.push({
                attackerId: socketId,
                targetId: oppId,
                damage: pvp.damage,
                killed: pvp.killed,
                targetHp: pvp.targetHp,
                targetMaxHp: pvp.targetMaxHp,
              });
              if (pvp.killed) playerDeaths.push(oppId);
            }
          }
        }
      }
    }

    const playerList = Array.from(this.players.values());
    for (const monster of this.monsters.values()) {
      const result = monster.update(dt, playerList);
      if (result) {
        const player = this.players.get(result.targetId);
        if (player && player.alive) {
          const died = player.takeDamage(result.damage);
          monsterAttacks.push({
            monsterId: monster.id,
            targetId: result.targetId,
            damage: result.damage,
            killed: died,
            targetHp: player.hp,
            targetMaxHp: player.maxHp,
          });
          if (died) playerDeaths.push(result.targetId);
        }
      }
    }

    return { transfers, monsterAttacks, playerAttacks, playerDeaths, playerRespawns, pvpAttacks };
  }

  getAllStates() {
    return Array.from(this.players.values()).map((p) => p.toState());
  }

  getStatesOnMap(mapId: string) {
    return Array.from(this.players.values())
      .filter((p) => p.mapId === mapId)
      .map((p) => p.toState());
  }

  getMonsterStatesOnMap(mapId: string) {
    return Array.from(this.monsters.values())
      .filter((m) => m.mapId === mapId)
      .map((m) => m.toState());
  }

  getAllMonsterStates() {
    return Array.from(this.monsters.values()).map((m) => m.toState());
  }
}
