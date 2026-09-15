import { Room, Client } from "colyseus";
import { WorldState, PlayerState, EnemyState } from "../schema/WorldState";
import { CLASSES, XP_TO_NEXT } from "../data/classes";
import { ENEMY_SPAWNS, ENEMY_TEMPLATES, RESPAWN_DELAY_MS } from "../data/enemies";
import { verifyToken } from "../auth";
import { getUser, updateProgress } from "../db";

const WORLD_W = 800;
const WORLD_H = 600;

interface Cooldowns {
  basicAttackReadyAt: number;
  abilityReadyAt: number;
}

export class GameRoom extends Room<WorldState> {
  maxClients = 100;

  private cooldowns = new Map<string, Cooldowns>();
  private lastEnemyAttack = new Map<string, number>();
  private enemyWanderTarget = new Map<string, { x: number; y: number }>();

  onCreate() {
    this.setState(new WorldState());

    for (const spawn of ENEMY_SPAWNS) {
      const tpl = ENEMY_TEMPLATES[spawn.template];
      const enemy = new EnemyState();
      enemy.templateKey = spawn.template;
      enemy.name = tpl.name;
      enemy.level = tpl.level;
      enemy.x = spawn.x;
      enemy.y = spawn.y;
      enemy.spawnX = spawn.x;
      enemy.spawnY = spawn.y;
      enemy.hp = tpl.maxHp;
      enemy.maxHp = tpl.maxHp;
      enemy.color = tpl.color;
      enemy.alive = true;
      this.state.enemies.set(spawn.id, enemy);
    }

    this.onMessage("move", (client, data: { dx: number; dy: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) return;
      const speed = 4;
      const dx = Math.max(-1, Math.min(1, data.dx));
      const dy = Math.max(-1, Math.min(1, data.dy));
      player.x = Math.max(0, Math.min(WORLD_W, player.x + dx * speed));
      player.y = Math.max(0, Math.min(WORLD_H, player.y + dy * speed));
    });

    this.onMessage("setTarget", (client, data: { targetId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.targetId = data.targetId || "";
    });

    this.onMessage("attack", (client) => this.handleAction(client, "basic"));
    this.onMessage("ability", (client) => this.handleAction(client, "ability"));

    this.onMessage("chat", (client, message: string) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.broadcast("chat", { name: player.username, message: String(message).slice(0, 200) });
    });

    // Loop de simulação: IA dos inimigos, ataques deles, regeneração leve de mana.
    this.setSimulationInterval(() => this.tick(), 150);
  }

  async onAuth(_client: Client, options: { token?: string }) {
    if (!options.token) throw new Error("Token ausente.");
    try {
      const payload = verifyToken(options.token);
      const user = getUser(payload.username);
      if (!user) throw new Error("Usuário não encontrado.");
      return user;
    } catch {
      throw new Error("Token inválido ou expirado.");
    }
  }

  onJoin(client: Client, _options: unknown, auth: { username: string; class: string; level: number; xp: number }) {
    const classDef = CLASSES[auth.class] || CLASSES.warrior;
    const player = new PlayerState();
    player.username = auth.username;
    player.className = classDef.key;
    player.color = classDef.color;
    player.level = auth.level;
    player.xp = auth.xp;
    player.xpToNext = XP_TO_NEXT(auth.level);
    player.maxHp = classDef.baseHp + (auth.level - 1) * 10;
    player.hp = player.maxHp;
    player.maxMana = classDef.baseMana + (auth.level - 1) * 5;
    player.mana = player.maxMana;
    player.x = WORLD_W / 2 + (Math.random() * 60 - 30);
    player.y = WORLD_H / 2 + (Math.random() * 60 - 30);

    this.state.players.set(client.sessionId, player);
    this.cooldowns.set(client.sessionId, { basicAttackReadyAt: 0, abilityReadyAt: 0 });
    console.log(`${player.username} (${classDef.label}) entrou no mundo.`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      updateProgress(player.username, player.level, player.xp);
      this.state.players.delete(client.sessionId);
    }
    this.cooldowns.delete(client.sessionId);
  }

  // --- Combate iniciado pelo jogador -------------------------------------

  private handleAction(client: Client, kind: "basic" | "ability") {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.alive || !player.targetId) return;

    const classDef = CLASSES[player.className];
    const cd = this.cooldowns.get(client.sessionId)!;
    const now = Date.now();

    const target = this.resolveTarget(player.targetId);
    if (!target) return;

    if (kind === "basic") {
      if (now < cd.basicAttackReadyAt) return;
      if (!this.inRange(player, target.entity, classDef.basicAttackRange)) return;
      cd.basicAttackReadyAt = now + 1200;
      this.applyDamage(client.sessionId, player, target, classDef.basicAttackDamage);
    } else {
      const ability = classDef.ability;
      if (now < cd.abilityReadyAt) return;
      if (player.mana < ability.manaCost) return;
      if (ability.type === "damage" && !this.inRange(player, target.entity, ability.range)) return;

      cd.abilityReadyAt = now + ability.cooldownMs;
      player.mana -= ability.manaCost;

      if (ability.type === "heal") {
        // habilidades de cura sempre afetam quem lançou (simplificação do protótipo)
        player.hp = Math.min(player.maxHp, player.hp + ability.power);
      } else {
        this.applyDamage(client.sessionId, player, target, ability.power);
      }
    }
  }

  private resolveTarget(targetId: string): { kind: "player" | "enemy"; entity: PlayerState | EnemyState } | null {
    const enemy = this.state.enemies.get(targetId);
    if (enemy && enemy.alive) return { kind: "enemy", entity: enemy };
    const p = this.state.players.get(targetId);
    if (p && p.alive) return { kind: "player", entity: p };
    return null;
  }

  private inRange(a: { x: number; y: number }, b: { x: number; y: number }, range: number) {
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    return dist <= range + 20; // pequena margem de tolerância
  }

  private applyDamage(
    attackerSessionId: string,
    attacker: PlayerState,
    target: { kind: "player" | "enemy"; entity: PlayerState | EnemyState },
    amount: number
  ) {
    const variance = 0.85 + Math.random() * 0.3; // dano varia +-15%
    const dmg = Math.max(1, Math.round(amount * variance));
    target.entity.hp = Math.max(0, target.entity.hp - dmg);

    if (target.entity.hp === 0) {
      if (target.kind === "enemy") {
        this.onEnemyKilled(attackerSessionId, attacker, target.entity as EnemyState, this.findEnemyId(target.entity as EnemyState));
      } else {
        this.onPlayerKilled(target.entity as PlayerState);
      }
    }
  }

  private findEnemyId(enemy: EnemyState): string {
    for (const [id, e] of this.state.enemies.entries()) if (e === enemy) return id;
    return "";
  }

  private onEnemyKilled(attackerSessionId: string, attacker: PlayerState, enemy: EnemyState, enemyId: string) {
    enemy.alive = false;
    const tpl = ENEMY_TEMPLATES[enemy.templateKey];

    attacker.xp += tpl.xpReward;
    let leveledUp = false;
    while (attacker.xp >= attacker.xpToNext) {
      attacker.xp -= attacker.xpToNext;
      attacker.level += 1;
      attacker.xpToNext = XP_TO_NEXT(attacker.level);
      const classDef = CLASSES[attacker.className];
      attacker.maxHp = classDef.baseHp + (attacker.level - 1) * 10;
      attacker.maxMana = classDef.baseMana + (attacker.level - 1) * 5;
      attacker.hp = attacker.maxHp;
      attacker.mana = attacker.maxMana;
      leveledUp = true;
    }
    if (leveledUp) {
      this.broadcast("levelUp", { username: attacker.username, level: attacker.level });
    }
    attacker.targetId = "";

    this.clock.setTimeout(() => {
      enemy.hp = enemy.maxHp;
      enemy.x = enemy.spawnX;
      enemy.y = enemy.spawnY;
      enemy.alive = true;
    }, RESPAWN_DELAY_MS);
  }

  private onPlayerKilled(player: PlayerState) {
    player.alive = false;
    player.targetId = "";
    this.clock.setTimeout(() => {
      player.hp = player.maxHp;
      player.mana = player.maxMana;
      player.x = WORLD_W / 2;
      player.y = WORLD_H / 2;
      player.alive = true;
    }, 5000);
  }

  // --- IA dos inimigos ------------------------------------------------

  private tick() {
    const now = Date.now();

    for (const [id, enemy] of this.state.enemies.entries()) {
      if (!enemy.alive) continue;

      const nearestPlayer = this.findNearestAlivePlayer(enemy);
      const tpl = ENEMY_TEMPLATES[enemy.templateKey];

      if (nearestPlayer && this.inRange(enemy, nearestPlayer.entity, tpl.aggroRange)) {
        // persegue e ataca
        const dx = nearestPlayer.entity.x - enemy.x;
        const dy = nearestPlayer.entity.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > tpl.attackRange) {
          const speed = 2;
          enemy.x += (dx / dist) * speed;
          enemy.y += (dy / dist) * speed;
        } else {
          const last = this.lastEnemyAttack.get(id) || 0;
          if (now - last >= tpl.attackIntervalMs) {
            this.lastEnemyAttack.set(id, now);
            const dmg = Math.max(1, Math.round(tpl.damage * (0.85 + Math.random() * 0.3)));
            nearestPlayer.entity.hp = Math.max(0, nearestPlayer.entity.hp - dmg);
            if (nearestPlayer.entity.hp === 0) this.onPlayerKilled(nearestPlayer.entity);
          }
        }
      } else {
        // vagueia perto do spawn
        let wander = this.enemyWanderTarget.get(id);
        if (!wander || Math.hypot(enemy.x - wander.x, enemy.y - wander.y) < 5) {
          wander = {
            x: enemy.spawnX + (Math.random() * 100 - 50),
            y: enemy.spawnY + (Math.random() * 100 - 50),
          };
          this.enemyWanderTarget.set(id, wander);
        }
        const dx = wander.x - enemy.x;
        const dy = wander.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const speed = 0.6;
          enemy.x += (dx / dist) * speed;
          enemy.y += (dy / dist) * speed;
        }
      }
    }

    // leve regeneração de mana fora de combate
    for (const player of this.state.players.values()) {
      if (player.alive && player.mana < player.maxMana) {
        player.mana = Math.min(player.maxMana, player.mana + 1);
      }
    }
  }

  private findNearestAlivePlayer(enemy: EnemyState): { entity: PlayerState } | null {
    let closest: PlayerState | null = null;
    let closestDist = Infinity;
    for (const player of this.state.players.values()) {
      if (!player.alive) continue;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = player;
      }
    }
    return closest ? { entity: closest } : null;
  }
}
