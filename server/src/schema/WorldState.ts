import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") username: string = "";
  @type("string") className: string = "warrior";
  @type("number") color: number = 0xffffff;
  @type("number") x: number = 400;
  @type("number") y: number = 300;
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;
  @type("number") mana: number = 50;
  @type("number") maxMana: number = 50;
  @type("number") level: number = 1;
  @type("number") xp: number = 0;
  @type("number") xpToNext: number = 75;
  @type("string") targetId: string = ""; // sessionId de outro player ou id de inimigo
  @type("boolean") alive: boolean = true;
}

export class EnemyState extends Schema {
  @type("string") templateKey: string = "";
  @type("string") name: string = "";
  @type("number") level: number = 1;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") spawnX: number = 0;
  @type("number") spawnY: number = 0;
  @type("number") hp: number = 10;
  @type("number") maxHp: number = 10;
  @type("number") color: number = 0xff0000;
  @type("boolean") alive: boolean = true;
}

export class WorldState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: EnemyState }) enemies = new MapSchema<EnemyState>();
}
