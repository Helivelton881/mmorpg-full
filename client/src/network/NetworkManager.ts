import { io, Socket } from 'socket.io-client';
import {
  Events,
  InputPayload,
  WelcomePayload,
  PlayerUpdatePayload,
  CharacterInfo,
} from '@mmorpg/shared';

export class NetworkManager {
  private socket: Socket | null = null;
  private serverUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SERVER_URL) ||
    'http://localhost:3001';

  connect() {
    if (this.socket?.connected) return;
    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[Client] Connected to server');
      const status = document.getElementById('status');
      if (status) status.textContent = 'Conectado ao servidor';
    });

    this.socket.on('disconnect', () => {
      console.log('[Client] Disconnected');
      const status = document.getElementById('status');
      if (status) status.textContent = 'Desconectado do servidor';
    });
  }

  // ---- Auth ----
  register(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket?.once(Events.REGISTER_RESULT, resolve);
      this.socket?.emit(Events.REGISTER, { username, password });
    });
  }

  login(username: string, password: string): Promise<{ ok: boolean; error?: string; token?: string }> {
    return new Promise((resolve) => {
      this.socket?.once(Events.LOGIN_RESULT, resolve);
      this.socket?.emit(Events.LOGIN, { username, password });
    });
  }

  listCharacters(): Promise<{ ok: boolean; characters: CharacterInfo[]; error?: string }> {
    return new Promise((resolve) => {
      this.socket?.once(Events.CHARACTERS_LIST, resolve);
      this.socket?.emit(Events.LIST_CHARACTERS);
    });
  }

  createCharacter(name: string, className: string): Promise<{ ok: boolean; error?: string; character?: CharacterInfo }> {
    return new Promise((resolve) => {
      this.socket?.once(Events.CREATE_CHARACTER_RESULT, resolve);
      this.socket?.emit(Events.CREATE_CHARACTER, { name, className });
    });
  }

  selectCharacter(characterId: string): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket?.once(Events.SELECT_CHARACTER_RESULT, resolve);
      this.socket?.emit(Events.SELECT_CHARACTER, { characterId });
    });
  }

  // ---- Game ----
  onWelcome(cb: (data: WelcomePayload) => void) {
    this.socket?.on(Events.WELCOME, cb);
  }

  onPlayerUpdate(cb: (data: PlayerUpdatePayload[] | PlayerUpdatePayload) => void) {
    this.socket?.on(Events.PLAYER_UPDATE, cb);
  }

  onPlayersSnapshot(cb: (data: PlayerUpdatePayload[]) => void) {
    this.socket?.on(Events.PLAYERS_SNAPSHOT, cb);
  }

  onPlayerLeft(cb: (data: { id: string }) => void) {
    this.socket?.on(Events.PLAYER_LEFT, cb);
  }

  onMapChange(cb: (data: import('@mmorpg/shared').MapChangePayload) => void) {
    this.socket?.on(Events.MAP_CHANGE, cb);
  }

  onMonstersSnapshot(cb: (data: import('@mmorpg/shared').MonsterState[]) => void) {
    this.socket?.on(Events.MONSTERS_SNAPSHOT, cb);
  }

  onMonsterUpdate(cb: (data: import('@mmorpg/shared').MonsterState[] | import('@mmorpg/shared').MonsterState) => void) {
    this.socket?.on(Events.MONSTER_UPDATE, cb);
  }

  onCombatEvent(cb: (data: import('@mmorpg/shared').CombatEventPayload) => void) {
    this.socket?.on(Events.COMBAT_EVENT, cb);
  }

  onLevelUp(cb: (data: import('@mmorpg/shared').LevelUpPayload) => void) {
    this.socket?.on(Events.LEVEL_UP, cb);
  }

  onPlayerDied(cb: (data: { id: string }) => void) {
    this.socket?.on(Events.PLAYER_DIED, cb);
  }

  onPlayerRespawned(cb: (data: { id: string; x: number; y: number; hp: number; maxHp: number }) => void) {
    this.socket?.on(Events.PLAYER_RESPAWNED, cb);
  }

  sendInput(input: InputPayload) {
    if (this.socket?.connected) {
      this.socket.emit(Events.INPUT, input);
    }
  }

  disconnect() {
    this.socket?.disconnect();
  }


  useItem(itemId: string) { this.socket?.emit(Events.USE_ITEM, { itemId }); }
  equipItem(itemId: string) { this.socket?.emit(Events.EQUIP_ITEM, { itemId }); }
  unequipItem(slot: 'weapon' | 'armor') { this.socket?.emit(Events.UNEQUIP_ITEM, { slot }); }
  useSkill(skillId: string) { this.socket?.emit(Events.USE_SKILL, { skillId }); }
  interactNpc(npcId: string) { this.socket?.emit(Events.INTERACT_NPC, { npcId }); }
  buyItem(itemId: string, npcId: string) { this.socket?.emit(Events.BUY_ITEM, { itemId, npcId }); }
  sellItem(itemId: string, quantity = 1) { this.socket?.emit(Events.SELL_ITEM, { itemId, quantity }); }

  onInventoryUpdate(cb: (data: any) => void) { this.socket?.on(Events.INVENTORY_UPDATE, cb); }
  onGoldUpdate(cb: (data: { gold: number }) => void) { this.socket?.on(Events.GOLD_UPDATE, cb); }
  onNpcDialog(cb: (data: any) => void) { this.socket?.on(Events.NPC_DIALOG, cb); }
  onShopOpen(cb: (data: any) => void) { this.socket?.on(Events.SHOP_OPEN, cb); }
  onActionResult(cb: (data: { ok: boolean; error?: string }) => void) { this.socket?.on(Events.ACTION_RESULT, cb); }
  onSkillUsed(cb: (data: any) => void) { this.socket?.on(Events.SKILL_USED, cb); }

  acceptQuest(questId: string) { this.socket?.emit(Events.ACCEPT_QUEST, { questId }); }
  turnInQuest(questId: string) { this.socket?.emit(Events.TURN_IN_QUEST, { questId }); }
  requestQuestList() { this.socket?.emit(Events.QUEST_LIST); }
  onQuestList(cb: (data: any) => void) { this.socket?.on(Events.QUEST_LIST, cb); }
  onQuestUpdate(cb: (data: any) => void) { this.socket?.on(Events.QUEST_UPDATE, cb); }

  sendChat(channel: string, text: string, targetName?: string) {
    this.socket?.emit(Events.CHAT_SEND, { channel, text, targetName });
  }
  requestOnline() { this.socket?.emit(Events.REQUEST_ONLINE); }
  onChatMessage(cb: (data: any) => void) { this.socket?.on(Events.CHAT_MESSAGE, cb); }
  onChatSystem(cb: (data: any) => void) { this.socket?.on(Events.CHAT_SYSTEM, cb); }
  onOnlineList(cb: (data: { players: any[] }) => void) { this.socket?.on(Events.ONLINE_LIST, cb); }

  partyCreate() { this.socket?.emit(Events.PARTY_CREATE); }
  partyInvite(name: string) { this.socket?.emit(Events.PARTY_INVITE, { name }); }
  partyAccept() { this.socket?.emit(Events.PARTY_ACCEPT); }
  partyLeave() { this.socket?.emit(Events.PARTY_LEAVE); }
  duelRequest(name: string) { this.socket?.emit(Events.DUEL_REQUEST, { name }); }
  duelAccept() { this.socket?.emit(Events.DUEL_ACCEPT); }
  tradeRequest(name: string) { this.socket?.emit(Events.TRADE_REQUEST, { name }); }
  tradeAccept() { this.socket?.emit(Events.TRADE_ACCEPT); }
  tradeSetItem(itemId: string, quantity: number) { this.socket?.emit(Events.TRADE_SET_ITEM, { itemId, quantity }); }
  tradeSetGold(gold: number) { this.socket?.emit(Events.TRADE_SET_GOLD, { gold }); }
  tradeConfirm() { this.socket?.emit(Events.TRADE_CONFIRM); }
  tradeCancel() { this.socket?.emit(Events.TRADE_CANCEL); }

  onPartyUpdate(cb: (data: any) => void) { this.socket?.on(Events.PARTY_UPDATE, cb); }
  onPartyInvite(cb: (data: any) => void) { this.socket?.on(Events.PARTY_INVITE_RECV, cb); }
  onDuelUpdate(cb: (data: any) => void) { this.socket?.on(Events.DUEL_UPDATE, cb); }
  onTradeUpdate(cb: (data: any) => void) { this.socket?.on(Events.TRADE_UPDATE, cb); }

  deleteCharacter(characterId: string) { this.socket?.emit(Events.DELETE_CHARACTER, { characterId }); }
  onDeleteCharacterResult(cb: (data: any) => void) { this.socket?.on(Events.DELETE_CHARACTER_RESULT, cb); }
  onServerInfo(cb: (data: any) => void) { this.socket?.on(Events.SERVER_INFO, cb); }
  onCharactersList(cb: (data: any) => void) { this.socket?.on(Events.CHARACTERS_LIST, cb); }

  setServerUrl(url: string) {
    this.serverUrl = url;
  }

  getServerUrl() {
    return this.serverUrl;
  }

  getSocket() {
    return this.socket;
  }
}

// Singleton for easy access across scenes
export const network = new NetworkManager();
