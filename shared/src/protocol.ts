/** Network protocol - V0.7 / V0.8 / V0.9 */

export const Events = {
  REGISTER:'register', LOGIN:'login', CREATE_CHARACTER:'createCharacter', SELECT_CHARACTER:'selectCharacter',
  LIST_CHARACTERS:'listCharacters', DELETE_CHARACTER:'deleteCharacter', ADMIN_COMMAND:'adminCommand',
  JOIN:'join', INPUT:'input', ATTACK:'attack', USE_ITEM:'useItem', EQUIP_ITEM:'equipItem',
  UNEQUIP_ITEM:'unequipItem', USE_SKILL:'useSkill', INTERACT_NPC:'interactNpc', BUY_ITEM:'buyItem', SELL_ITEM:'sellItem',
  REGISTER_RESULT:'registerResult', LOGIN_RESULT:'loginResult', CHARACTERS_LIST:'charactersList',
  CREATE_CHARACTER_RESULT:'createCharacterResult', SELECT_CHARACTER_RESULT:'selectCharacterResult',
  DELETE_CHARACTER_RESULT:'deleteCharacterResult', SERVER_INFO:'serverInfo',
  WELCOME:'welcome', PLAYER_UPDATE:'playerUpdate', PLAYERS_SNAPSHOT:'playersSnapshot', PLAYER_LEFT:'playerLeft',
  MAP_CHANGE:'mapChange', MONSTERS_SNAPSHOT:'monstersSnapshot', MONSTER_UPDATE:'monsterUpdate',
  COMBAT_EVENT:'combatEvent', LEVEL_UP:'levelUp', PLAYER_DIED:'playerDied', PLAYER_RESPAWNED:'playerRespawned',
  INVENTORY_UPDATE:'inventoryUpdate', GOLD_UPDATE:'goldUpdate', NPC_DIALOG:'npcDialog', SHOP_OPEN:'shopOpen',
  ACTION_RESULT:'actionResult', SKILL_USED:'skillUsed', ACCEPT_QUEST:'acceptQuest', TURN_IN_QUEST:'turnInQuest',
  QUEST_LIST:'questList', QUEST_UPDATE:'questUpdate', CHAT_SEND:'chatSend', CHAT_MESSAGE:'chatMessage',
  CHAT_SYSTEM:'chatSystem', ONLINE_LIST:'onlineList', REQUEST_ONLINE:'requestOnline',
  PARTY_CREATE:'partyCreate', PARTY_INVITE:'partyInvite', PARTY_ACCEPT:'partyAccept', PARTY_DECLINE:'partyDecline',
  PARTY_LEAVE:'partyLeave', PARTY_KICK:'partyKick', PARTY_UPDATE:'partyUpdate', PARTY_INVITE_RECV:'partyInviteRecv',
  DUEL_REQUEST:'duelRequest', DUEL_ACCEPT:'duelAccept', DUEL_DECLINE:'duelDecline', DUEL_UPDATE:'duelUpdate',
  TRADE_REQUEST:'tradeRequest', TRADE_ACCEPT:'tradeAccept', TRADE_DECLINE:'tradeDecline', TRADE_UPDATE:'tradeUpdate',
  TRADE_SET_ITEM:'tradeSetItem', TRADE_SET_GOLD:'tradeSetGold', TRADE_CONFIRM:'tradeConfirm', TRADE_CANCEL:'tradeCancel',
} as const;

export interface WelcomePayload {
  id:string; name:string; x:number; y:number; className?:string; mapId?:string;
  hp?:number; maxHp?:number; mp?:number; maxMp?:number; level?:number; experience?:number;
  gold?:number; inventory?:Array<{itemId:string;quantity:number}>; equipment?:{weapon:string|null;armor:string|null};
}
export interface PlayerUpdatePayload {
  id:string; name:string; x:number; y:number; direction:string; className?:string; mapId?:string;
  hp?:number; maxHp?:number; mp?:number; maxMp?:number; level?:number; alive?:boolean;
}
export interface CharacterInfo { id:string; name:string; className:string; level:number; posX:number; posY:number; mapId?:string; }
export interface MapChangePayload { mapId:string; x:number; y:number; }
export interface MonsterState { id:string; type:string; name:string; x:number; y:number; hp:number; maxHp:number; mapId:string; state:string; }
export interface CombatEventPayload { attackerId:string; targetId:string; damage:number; targetHp:number; targetMaxHp:number; isMonsterTarget:boolean; killed?:boolean; }
export interface LevelUpPayload { level:number; experience:number; maxHp:number; maxMp:number; }
export interface InventoryUpdatePayload {
  inventory:Array<{itemId:string;quantity:number}>; equipment:{weapon:string|null;armor:string|null}; gold:number;
}
export interface SkillUsedPayload { casterId:string; skillId:string; x:number; y:number; targetIds:string[]; }
export interface QuestProgressPayload {
  questId:string; status:string; progress:number[]; name?:string; description?:string;
  objectives?:Array<{description:string;current:number;required:number;type:string}>;
}
export interface QuestListPayload {
  quests:QuestProgressPayload[];
  available:Array<{id:string;name:string;description:string;minLevel:number}>;
}
export type ChatChannel = 'global' | 'local' | 'private' | 'system';
export interface ChatSendPayload { channel:ChatChannel; text:string; targetName?:string; }
export interface ChatMessagePayload { channel:ChatChannel; from:string; fromId?:string; text:string; to?:string; timestamp:number; }
