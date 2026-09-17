import { createServer } from 'http';
import { Server } from 'socket.io';
import { World } from './world/World';
import { SocketHandler } from './network/SocketHandler';
import { db } from './db/Database';
import { Events } from '@mmorpg/shared';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
let worldRef: World | null = null;
let shuttingDown = false;

async function main() {
  await db.connect();

  const httpServer = createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        version: '0.22',
        players: worldRef?.players?.size ?? 0,
        db: db.isMemoryMode() ? 'memory' : 'postgres',
      }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  const world = new World();
  worldRef = world;
  const socketHandler = new SocketHandler(io, world);

  const TICK_RATE = 20;
  const TICK_MS = 1000 / TICK_RATE;
  let lastTime = Date.now();

  setInterval(() => {
    for (const player of world.players.values()) {
      db.saveProgress(player.characterId, {
        x: player.x,
        y: player.y,
        mapId: player.mapId,
        level: player.level,
        experience: player.experience,
        gold: player.gold,
        inventory: player.inventory,
        equipment: player.equipment,
        quests: player.questLog,
      }).catch(() => {});
    }
  }, 30000);

  setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const duelTargets = new Map<string, string>();
    for (const [id] of world.players) {
      const opp = socketHandler.duel.getOpponent(id);
      if (opp) duelTargets.set(id, opp);
    }
    const { transfers, monsterAttacks, playerAttacks, playerDeaths, playerRespawns, pvpAttacks } = world.update(dt, duelTargets);

    if (transfers.length > 0) {
      socketHandler.handleTransfers(transfers);
    }

    for (const atk of playerAttacks) {
      io.emit(Events.COMBAT_EVENT, {
        attackerId: atk.attackerId,
        targetId: atk.targetId,
        damage: atk.damage,
        targetHp: atk.targetHp,
        targetMaxHp: atk.targetMaxHp,
        isMonsterTarget: true,
        killed: atk.killed,
      });
      const sock = io.sockets.sockets.get(atk.attackerId);
      const p = world.getPlayer(atk.attackerId);
      if (atk.levelUp) {
        sock?.emit(Events.LEVEL_UP, atk.levelUp);
        if (p) {
          io.emit(Events.CHAT_SYSTEM, {
            text: `${p.name} subiu para o nível ${p.level}!`,
            timestamp: Date.now(),
          });
        }
        if (p) {
          db.saveProgress(p.characterId, {
            x: p.x, y: p.y, mapId: p.mapId,
            level: p.level, experience: p.experience,
            gold: p.gold, inventory: p.inventory, equipment: p.equipment,
          }).catch(() => {});
        }
      }
      if (atk.killed && p) {
        if (atk.xpGained && atk.xpGained > 0) {
          const shares = socketHandler.party.distributeXp(atk.attackerId, atk.xpGained, world.players);
          for (const share of shares) {
            if (share.id === atk.attackerId) continue;
            const mate = world.getPlayer(share.id);
            if (mate) {
              const lvl = mate.addExperience(share.xp);
              const msock = io.sockets.sockets.get(share.id);
              if (lvl.leveled) msock?.emit(Events.LEVEL_UP, {
                level: mate.level, experience: mate.experience, maxHp: mate.maxHp, maxMp: mate.maxMp,
              });
              msock?.emit(Events.CHAT_SYSTEM, { text: `Party: +${share.xp} XP`, timestamp: Date.now() });
            }
          }
        }
        sock?.emit(Events.INVENTORY_UPDATE, p.toInventoryPayload());
        sock?.emit(Events.GOLD_UPDATE, { gold: p.gold });
        sock?.emit(Events.QUEST_UPDATE, p.getQuestPayload());
        db.saveProgress(p.characterId, {
          x: p.x, y: p.y, mapId: p.mapId,
          level: p.level, experience: p.experience,
          gold: p.gold, inventory: p.inventory, equipment: p.equipment, quests: p.questLog,
        }).catch(() => {});
      }
    }

    for (const atk of monsterAttacks) {
      io.emit(Events.COMBAT_EVENT, {
        attackerId: atk.monsterId,
        targetId: atk.targetId,
        damage: atk.damage,
        targetHp: atk.targetHp,
        targetMaxHp: atk.targetMaxHp,
        isMonsterTarget: false,
        killed: atk.killed,
      });
    }

    for (const atk of pvpAttacks || []) {
      io.emit(Events.COMBAT_EVENT, {
        attackerId: atk.attackerId,
        targetId: atk.targetId,
        damage: atk.damage,
        targetHp: atk.targetHp,
        targetMaxHp: atk.targetMaxHp,
        isMonsterTarget: false,
        killed: atk.killed,
      });
      if (atk.killed) {
        socketHandler.duel.end(atk.attackerId);
        const winner = world.getPlayer(atk.attackerId);
        const loser = world.getPlayer(atk.targetId);
        io.emit(Events.CHAT_SYSTEM, {
          text: `${winner?.name || 'Alguém'} venceu o duelo contra ${loser?.name || 'alguém'}!`,
          timestamp: Date.now(),
        });
      }
    }

    for (const id of playerDeaths) {
      io.emit(Events.PLAYER_DIED, { id });
    }
    for (const id of playerRespawns) {
      const p = world.getPlayer(id);
      if (p) {
        io.emit(Events.PLAYER_RESPAWNED, {
          id,
          x: p.x,
          y: p.y,
          hp: p.hp,
          maxHp: p.maxHp,
        });
      }
    }

    socketHandler.broadcastStates();
  }, TICK_MS);

  httpServer.listen(PORT, HOST, () => {
    console.log(`========================================`);
    console.log(`  MMORPG 2D Server - V0.22`);
    console.log(`  Listening on http://localhost:${PORT}`);
    console.log(`  Combat system active`);
    console.log(`========================================`);
  });
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Server] ${signal} received, saving players...`);
  if (worldRef) {
    for (const player of worldRef.players.values()) {
      try {
        await db.saveProgress(player.characterId, {
          x: player.x, y: player.y, mapId: player.mapId,
          level: player.level, experience: player.experience,
          gold: player.gold, inventory: player.inventory,
          equipment: player.equipment, quests: player.questLog,
        });
      } catch {}
    }
  }
  try { await db.disconnect(); } catch {}
  process.exit(0);
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
