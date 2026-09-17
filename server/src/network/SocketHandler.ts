import { Server, Socket } from 'socket.io';
import { World } from '../world/World';
import { db } from '../db/Database';
import {
  Events, InputPayload, WelcomePayload, CharacterInfo, MapChangePayload,
  NPCS, ITEMS, getMap,
} from '@mmorpg/shared';
import { PartyManager } from '../social/PartyManager';
import { DuelManager } from '../social/DuelManager';
import { TradeManager } from '../social/TradeManager';
import { AdminManager } from '../social/AdminManager';
import type { Player } from '../entities/Player';

interface SessionData {
  userId: string | null;
  characterId: string | null;
  token: string | null;
}

export class SocketHandler {
  private sessions = new Map<string, SessionData>();
  party = new PartyManager();
  duel = new DuelManager();
  trade = new TradeManager();
  admin = new AdminManager();

  constructor(private io: Server, private world: World) {
    this.setup();
  }

  private session(id: string): SessionData {
    let s = this.sessions.get(id);
    if (!s) {
      s = { userId: null, characterId: null, token: null };
      this.sessions.set(id, s);
    }
    return s;
  }

  private setup() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[Server] Client connected: ${socket.id}`);
      this.session(socket.id);
      socket.emit(Events.SERVER_INFO, { version: '0.22.1', motd: 'Servidor online' });

      socket.on(Events.REGISTER, async (data: { username: string; password: string }) => {
        socket.emit(Events.REGISTER_RESULT, await db.register(data?.username || '', data?.password || ''));
      });

      socket.on(Events.LOGIN, async (data: { username: string; password: string }) => {
        const result = await db.login(data?.username || '', data?.password || '');
        if (result.ok && result.userId && result.token) {
          const s = this.session(socket.id);
          s.userId = result.userId;
          s.token = result.token;
          this.admin.markIfAdmin(socket.id, data?.username || '');
        }
        socket.emit(Events.LOGIN_RESULT, result);
      });

      socket.on(Events.LIST_CHARACTERS, async () => {
        const s = this.session(socket.id);
        if (!s.userId) {
          socket.emit(Events.CHARACTERS_LIST, { ok: false, error: 'Não autenticado', characters: [] });
          return;
        }
        const chars = await db.getCharacters(s.userId);
        const characters: CharacterInfo[] = chars.map(c => ({
          id: c.id, name: c.name, className: c.class_name, level: c.level,
          posX: c.pos_x, posY: c.pos_y, mapId: c.map_id,
        }));
        socket.emit(Events.CHARACTERS_LIST, { ok: true, characters });
      });

      socket.on(Events.CREATE_CHARACTER, async (data: { name: string; className: string }) => {
        const s = this.session(socket.id);
        if (!s.userId) {
          socket.emit(Events.CREATE_CHARACTER_RESULT, { ok: false, error: 'Não autenticado' });
          return;
        }
        const result = await db.createCharacter(s.userId, data?.name || '', data?.className || 'guerreiro');
        socket.emit(Events.CREATE_CHARACTER_RESULT, {
          ok: result.ok,
          error: result.error,
          character: result.character ? {
            id: result.character.id,
            name: result.character.name,
            className: result.character.class_name,
            level: result.character.level,
            posX: result.character.pos_x,
            posY: result.character.pos_y,
            mapId: result.character.map_id,
          } : undefined,
        });
      });

      socket.on(Events.DELETE_CHARACTER, async (data: { characterId: string }) => {
        const s = this.session(socket.id);
        if (!s.userId) {
          socket.emit(Events.DELETE_CHARACTER_RESULT, { ok: false, error: 'Não autenticado' });
          return;
        }
        const active = this.world.getPlayer(socket.id);
        if (active?.characterId === data?.characterId) {
          socket.emit(Events.DELETE_CHARACTER_RESULT, { ok: false, error: 'Saia do mundo antes de deletar' });
          return;
        }
        socket.emit(Events.DELETE_CHARACTER_RESULT, await db.deleteCharacter(data?.characterId || '', s.userId));
      });

      socket.on(Events.SELECT_CHARACTER, async (data: { characterId: string }) => {
        const s = this.session(socket.id);
        if (!s.userId) {
          socket.emit(Events.SELECT_CHARACTER_RESULT, { ok: false, error: 'Não autenticado' });
          return;
        }
        const char = await db.getCharacter(data?.characterId || '', s.userId);
        if (!char) {
          socket.emit(Events.SELECT_CHARACTER_RESULT, { ok: false, error: 'Personagem não encontrado' });
          return;
        }
        if (this.world.getPlayer(socket.id)) {
          socket.emit(Events.SELECT_CHARACTER_RESULT, { ok: false, error: 'Já está no mundo' });
          return;
        }

        const mapId = char.map_id || 'starter';
        const map = getMap(mapId);
        const spawn = map.spawns[0] || { x: 400, y: 400 };
        let inventory: Array<{ itemId: string; quantity: number }> = [];
        let equipment: { weapon: string | null; armor: string | null } = { weapon: null, armor: null };
        let quests: any[] = [];
        try { inventory = char.inventory_json ? JSON.parse(char.inventory_json) : []; } catch {}
        try { equipment = char.equipment_json ? JSON.parse(char.equipment_json) : equipment; } catch {}
        try { quests = char.quests_json ? JSON.parse(char.quests_json) : []; } catch {}
        if (!Array.isArray(inventory)) inventory = [];
        if (!Array.isArray(quests)) quests = [];

        const player = this.world.addPlayer(
          socket.id, char.id, char.name, char.class_name,
          char.pos_x || spawn.x, char.pos_y || spawn.y, mapId,
          char.level || 1, char.experience || 0, char.gold ?? 50,
          inventory, equipment, quests
        );
        s.characterId = char.id;

        const welcome: WelcomePayload = {
          id: player.id, name: player.name, x: player.x, y: player.y,
          className: player.className, mapId: player.mapId,
          hp: player.hp, maxHp: player.maxHp, mp: player.mp, maxMp: player.maxMp,
          level: player.level, experience: player.experience, gold: player.gold,
          inventory: player.inventory, equipment: player.equipment,
        };

        socket.emit(Events.SELECT_CHARACTER_RESULT, { ok: true });
        socket.emit(Events.WELCOME, welcome);
        socket.emit(Events.PLAYERS_SNAPSHOT, this.world.getStatesOnMap(mapId));
        socket.emit(Events.MONSTERS_SNAPSHOT, this.world.getMonsterStatesOnMap(mapId));
        socket.emit(Events.QUEST_LIST, player.getQuestPayload());
        socket.emit(Events.INVENTORY_UPDATE, player.toInventoryPayload());
        socket.broadcast.emit(Events.PLAYER_UPDATE, player.toState());
        this.io.emit(Events.CHAT_SYSTEM, { text: `${player.name} entrou no mundo.`, timestamp: Date.now() });
      });

      socket.on(Events.INPUT, (input: InputPayload) => {
        if (!input || typeof input.up !== 'boolean' || typeof input.down !== 'boolean' ||
            typeof input.left !== 'boolean' || typeof input.right !== 'boolean') return;
        this.world.setInput(socket.id, {
          up: input.up, down: input.down, left: input.left, right: input.right, attack: !!input.attack,
        });
      });

      socket.on(Events.USE_ITEM, (data: { itemId: string }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const result = p.useItem(data?.itemId || '');
        socket.emit(Events.ACTION_RESULT, result);
        if (result.ok) this.afterInventoryChange(socket, p);
      });

      socket.on(Events.EQUIP_ITEM, (data: { itemId: string }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const result = p.equipItem(data?.itemId || '');
        socket.emit(Events.ACTION_RESULT, result);
        if (result.ok) this.afterInventoryChange(socket, p);
      });

      socket.on(Events.UNEQUIP_ITEM, (data: { slot: 'weapon' | 'armor' }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const result = p.unequipItem(data?.slot);
        socket.emit(Events.ACTION_RESULT, result);
        if (result.ok) this.afterInventoryChange(socket, p);
      });

      socket.on(Events.USE_SKILL, (data: { skillId: string }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const result = p.useSkill(data?.skillId || '', Array.from(this.world.monsters.values()));
        socket.emit(Events.ACTION_RESULT, { ok: result.ok, error: result.error });
        if (!result.ok) return;
        this.io.emit(Events.SKILL_USED, {
          casterId: p.id, skillId: data.skillId, x: p.x, y: p.y,
          targetIds: (result.damageEvents || []).map((e: any) => e.targetId),
        });
        for (const ev of result.damageEvents || []) {
          this.io.emit(Events.COMBAT_EVENT, {
            attackerId: p.id, targetId: ev.targetId, damage: ev.damage,
            targetHp: ev.targetHp, targetMaxHp: ev.targetMaxHp,
            isMonsterTarget: true, killed: ev.killed,
          });
          if (ev.killed) {
            const m = this.world.monsters.get(ev.targetId);
            const xp = m?.type === 'guardian' ? 200 : m?.type === 'skeleton' ? 40 :
              m?.type === 'spider' ? 35 : m?.type === 'wolf' ? 25 : m?.type === 'goblin' ? 18 : 12;
            const lvl = p.addExperience(xp);
            if (m) { p.applyDrops(m.type); p.onKill(m.type); p.syncCollectObjectives(); }
            if (lvl.leveled) socket.emit(Events.LEVEL_UP, {
              level: p.level, experience: p.experience, maxHp: p.maxHp, maxMp: p.maxMp,
            });
          }
        }
        socket.emit(Events.INVENTORY_UPDATE, p.toInventoryPayload());
        socket.emit(Events.QUEST_UPDATE, p.getQuestPayload());
        this.io.emit(Events.PLAYER_UPDATE, [p.toState()]);
        void this.savePlayerFull(p);
      });

      socket.on(Events.INTERACT_NPC, (data: { npcId: string }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const npc = NPCS.find(n => n.id === data?.npcId && n.mapId === p.mapId);
        if (!npc || Math.hypot(npc.x - p.x, npc.y - p.y) > 80) {
          socket.emit(Events.ACTION_RESULT, { ok: false, error: 'NPC não encontrado ou muito longe' });
          return;
        }
        p.onTalk(npc.id);
        socket.emit(Events.NPC_DIALOG, { npcId: npc.id, name: npc.name, dialog: npc.dialog, type: npc.type });
        if (npc.type === 'shop' && npc.shopItems) {
          const items = npc.shopItems.map(id => ITEMS[id]).filter(Boolean).map(it => ({
            id: it.id, name: it.name, price: it.price, description: it.description,
          }));
          socket.emit(Events.SHOP_OPEN, { npcId: npc.id, items, gold: p.gold });
        }
        socket.emit(Events.QUEST_UPDATE, p.getQuestPayload());
        void this.savePlayerFull(p);
      });

      socket.on(Events.BUY_ITEM, (data: { itemId: string; npcId: string }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const npc = NPCS.find(n => n.id === data?.npcId && n.type === 'shop');
        if (!npc?.shopItems?.includes(data?.itemId)) {
          socket.emit(Events.ACTION_RESULT, { ok: false, error: 'Item não disponível' }); return;
        }
        const result = p.buyItem(data.itemId);
        socket.emit(Events.ACTION_RESULT, result);
        if (result.ok) this.afterInventoryChange(socket, p);
      });

      socket.on(Events.SELL_ITEM, (data: { itemId: string; quantity?: number }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const result = p.sellItem(data?.itemId || '', data?.quantity || 1);
        socket.emit(Events.ACTION_RESULT, result);
        if (result.ok) this.afterInventoryChange(socket, p);
      });

      socket.on(Events.QUEST_LIST, () => {
        const p = this.world.getPlayer(socket.id); if (p) socket.emit(Events.QUEST_LIST, p.getQuestPayload());
      });

      socket.on(Events.ACCEPT_QUEST, (data: { questId: string }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const result = p.acceptQuest(data?.questId || '');
        socket.emit(Events.ACTION_RESULT, result);
        if (result.ok) {
          p.syncCollectObjectives();
          socket.emit(Events.QUEST_UPDATE, p.getQuestPayload());
          void this.savePlayerFull(p);
        }
      });

      socket.on(Events.TURN_IN_QUEST, (data: { questId: string }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const result = p.turnInQuest(data?.questId || '');
        socket.emit(Events.ACTION_RESULT, { ok: result.ok, error: result.error });
        if (result.ok) {
          socket.emit(Events.QUEST_UPDATE, p.getQuestPayload());
          this.afterInventoryChange(socket, p);
          if (result.rewards?.levelUp) socket.emit(Events.LEVEL_UP, result.rewards.levelUp);
        }
      });

      socket.on(Events.CHAT_SEND, (data: { channel: string; text: string; targetName?: string }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const text = (data?.text || '').trim().slice(0, 200); if (!text) return;
        const now = Date.now();
        const channel = data?.channel || 'local';
        const payload = { channel, from: p.name, fromId: p.id, text, timestamp: now };
        if (channel === 'global') this.io.emit(Events.CHAT_MESSAGE, payload);
        else if (channel === 'private') {
          const target = this.findPlayerByName(data?.targetName || '');
          if (!target) { socket.emit(Events.CHAT_SYSTEM, { text: 'Jogador não encontrado', timestamp: now }); return; }
          const msg = { ...payload, channel: 'private', to: target.name };
          this.io.to(target.id).emit(Events.CHAT_MESSAGE, msg);
          socket.emit(Events.CHAT_MESSAGE, msg);
        } else {
          for (const [id, other] of this.world.players) {
            if (other.mapId === p.mapId) this.io.to(id).emit(Events.CHAT_MESSAGE, payload);
          }
        }
      });

      socket.on(Events.REQUEST_ONLINE, () => {
        const players = Array.from(this.world.players.values()).map(p => ({
          id: p.id, name: p.name, level: p.level, className: p.className, mapId: p.mapId,
        }));
        socket.emit(Events.ONLINE_LIST, { players });
      });

      socket.on(Events.PARTY_CREATE, () => {
        if (!this.world.getPlayer(socket.id)) return;
        this.party.create(socket.id); this.emitPartyUpdate(socket.id);
      });
      socket.on(Events.PARTY_INVITE, (data: { name: string }) => {
        const target = this.findPlayerByName(data?.name || '');
        const p = this.world.getPlayer(socket.id);
        if (!target || !p) { socket.emit(Events.ACTION_RESULT, { ok: false, error: 'Jogador não encontrado' }); return; }
        const result = this.party.invite(socket.id, target.id);
        socket.emit(Events.ACTION_RESULT, result);
        if (result.ok) this.io.to(target.id).emit(Events.PARTY_INVITE_RECV, { fromId: p.id, fromName: p.name });
      });
      socket.on(Events.PARTY_ACCEPT, () => {
        const result = this.party.accept(socket.id); socket.emit(Events.ACTION_RESULT, result);
        if (result.party) for (const id of result.party.members) this.emitPartyUpdate(id);
      });
      socket.on(Events.PARTY_LEAVE, () => {
        const old = this.party.getParty(socket.id);
        const members = old ? Array.from(old.members) : [];
        this.party.leave(socket.id);
        socket.emit(Events.PARTY_UPDATE, { members: [] });
        for (const id of members) if (id !== socket.id) this.emitPartyUpdate(id);
      });

      socket.on(Events.DUEL_REQUEST, (data: { name: string }) => {
        const p = this.world.getPlayer(socket.id), target = this.findPlayerByName(data?.name || '');
        if (!p || !target) { socket.emit(Events.ACTION_RESULT, { ok: false, error: 'Jogador não encontrado' }); return; }
        const result = this.duel.request(socket.id, target.id, p.mapId);
        socket.emit(Events.ACTION_RESULT, result);
        if (result.ok) this.io.to(target.id).emit(Events.DUEL_UPDATE, { type: 'request', fromName: p.name });
      });
      socket.on(Events.DUEL_ACCEPT, () => {
        const result = this.duel.accept(socket.id); socket.emit(Events.ACTION_RESULT, result);
        if (result.duel) {
          this.io.to(result.duel.a).emit(Events.DUEL_UPDATE, { type: 'start', opponentId: result.duel.b });
          this.io.to(result.duel.b).emit(Events.DUEL_UPDATE, { type: 'start', opponentId: result.duel.a });
        }
      });
      socket.on(Events.DUEL_DECLINE, () => this.duel.decline(socket.id));

      socket.on(Events.TRADE_REQUEST, (data: { name: string }) => {
        const p = this.world.getPlayer(socket.id), target = this.findPlayerByName(data?.name || '');
        if (!p || !target || p.mapId !== target.mapId || Math.hypot(p.x-target.x,p.y-target.y)>100) {
          socket.emit(Events.ACTION_RESULT, { ok: false, error: 'Jogador indisponível ou muito longe' }); return;
        }
        const result = this.trade.request(socket.id, target.id);
        socket.emit(Events.ACTION_RESULT, result);
        if (result.ok) this.io.to(target.id).emit(Events.TRADE_UPDATE, { type: 'request', fromName: p.name });
      });
      socket.on(Events.TRADE_ACCEPT, () => {
        const result = this.trade.accept(socket.id); socket.emit(Events.ACTION_RESULT, result);
        if (result.session) this.broadcastTrade(socket.id, 'open');
      });
      socket.on(Events.TRADE_SET_ITEM, (data: { itemId: string; quantity: number }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const qty = Math.max(0, Math.floor(data?.quantity || 0));
        const slot = p.inventory.find(x => x.itemId === data?.itemId);
        if (qty > 0 && (!slot || slot.quantity < qty)) return;
        if (this.trade.setItem(socket.id, data?.itemId || '', qty).ok) this.broadcastTrade(socket.id);
      });
      socket.on(Events.TRADE_SET_GOLD, (data: { gold: number }) => {
        const p = this.world.getPlayer(socket.id); if (!p) return;
        const g = Math.max(0, Math.floor(data?.gold || 0)); if (g > p.gold) return;
        if (this.trade.setGold(socket.id, g).ok) this.broadcastTrade(socket.id);
      });
      socket.on(Events.TRADE_CONFIRM, () => {
        const result = this.trade.confirm(socket.id);
        if (result.bothConfirmed) this.executeTrade(socket.id); else this.broadcastTrade(socket.id);
      });
      socket.on(Events.TRADE_CANCEL, () => {
        const s = this.trade.getSession(socket.id);
        if (s) {
          this.io.to(s.a).emit(Events.TRADE_UPDATE, { type: 'cancel' });
          this.io.to(s.b).emit(Events.TRADE_UPDATE, { type: 'cancel' });
          this.trade.cancel(socket.id);
        }
      });

      socket.on('disconnect', async () => {
        const p = this.world.getPlayer(socket.id);
        if (p) {
          try { await this.savePlayerFull(p); } catch {}
          const name = p.name;
          this.party.leave(socket.id); this.duel.end(socket.id); this.trade.cancel(socket.id); this.admin.clear(socket.id);
          this.world.removePlayer(socket.id);
          this.io.emit(Events.PLAYER_LEFT, { id: socket.id });
          this.io.emit(Events.CHAT_SYSTEM, { text: `${name} saiu do jogo.`, timestamp: Date.now() });
        }
        this.sessions.delete(socket.id);
      });
    });
  }

  private afterInventoryChange(socket: Socket, p: Player) {
    socket.emit(Events.INVENTORY_UPDATE, p.toInventoryPayload());
    socket.emit(Events.GOLD_UPDATE, { gold: p.gold });
    this.io.emit(Events.PLAYER_UPDATE, [p.toState()]);
    void this.savePlayerFull(p);
  }

  private findPlayerByName(name: string) {
    const n = name.trim().toLowerCase();
    for (const p of this.world.players.values()) if (p.name.toLowerCase() === n) return p;
    return null;
  }

  private emitPartyUpdate(socketId: string) {
    const party = this.party.getParty(socketId);
    if (!party) { this.io.to(socketId).emit(Events.PARTY_UPDATE, { members: [] }); return; }
    const members = Array.from(party.members).map(id => {
      const p = this.world.getPlayer(id);
      return p ? { id, name: p.name, level: p.level, mapId: p.mapId, isLeader: party.leaderId === id } : null;
    }).filter(Boolean);
    for (const id of party.members) this.io.to(id).emit(Events.PARTY_UPDATE, { members, leaderId: party.leaderId });
  }

  private broadcastTrade(socketId: string, type = 'update') {
    const s = this.trade.getSession(socketId); if (!s) return;
    const payload = { type, session: { a:s.a, b:s.b, offerA:s.offerA, offerB:s.offerB } };
    this.io.to(s.a).emit(Events.TRADE_UPDATE, payload);
    this.io.to(s.b).emit(Events.TRADE_UPDATE, payload);
  }

  private executeTrade(socketId: string) {
    const s = this.trade.getSession(socketId); if (!s) return;
    const a = this.world.getPlayer(s.a), b = this.world.getPlayer(s.b);
    if (!a || !b) { this.trade.cancel(socketId); return; }
    for (const it of s.offerA.items) {
      const slot = a.inventory.find(x => x.itemId === it.itemId);
      if (!slot || slot.quantity < it.quantity) { this.trade.cancel(socketId); return; }
    }
    for (const it of s.offerB.items) {
      const slot = b.inventory.find(x => x.itemId === it.itemId);
      if (!slot || slot.quantity < it.quantity) { this.trade.cancel(socketId); return; }
    }
    if (s.offerA.gold > a.gold || s.offerB.gold > b.gold) { this.trade.cancel(socketId); return; }
    for (const it of s.offerA.items) { a.removeItem(it.itemId,it.quantity); b.addItem(it.itemId,it.quantity); }
    for (const it of s.offerB.items) { b.removeItem(it.itemId,it.quantity); a.addItem(it.itemId,it.quantity); }
    a.gold += s.offerB.gold - s.offerA.gold;
    b.gold += s.offerA.gold - s.offerB.gold;
    for (const p of [a,b]) {
      this.io.to(p.id).emit(Events.INVENTORY_UPDATE, p.toInventoryPayload());
      this.io.to(p.id).emit(Events.GOLD_UPDATE, { gold: p.gold });
      this.io.to(p.id).emit(Events.TRADE_UPDATE, { type: 'done' });
      void this.savePlayerFull(p);
    }
    this.trade.cancel(socketId);
  }

  private async savePlayerFull(player: Player) {
    await db.saveProgress(player.characterId, {
      x:player.x, y:player.y, mapId:player.mapId, level:player.level, experience:player.experience,
      gold:player.gold, inventory:player.inventory, equipment:player.equipment, quests:player.questLog,
    });
  }

  handleTransfers(transfers: Array<{ socketId:string; mapId:string; x:number; y:number }>) {
    for (const t of transfers) {
      const socket = this.io.sockets.sockets.get(t.socketId); if (!socket) continue;
      const payload: MapChangePayload = { mapId:t.mapId, x:t.x, y:t.y };
      socket.emit(Events.MAP_CHANGE, payload);
      socket.emit(Events.PLAYERS_SNAPSHOT, this.world.getStatesOnMap(t.mapId));
      socket.emit(Events.MONSTERS_SNAPSHOT, this.world.getMonsterStatesOnMap(t.mapId));
    }
  }

  broadcastStates() {
    const players = this.world.getAllStates();
    if (players.length) this.io.emit(Events.PLAYER_UPDATE, players);
    const monsters = this.world.getAllMonsterStates();
    if (monsters.length) this.io.emit(Events.MONSTER_UPDATE, monsters);
  }
}
