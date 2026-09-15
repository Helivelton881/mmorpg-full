// Definições das classes. Balanceamento e nomes de habilidade são originais,
// só a IDEIA de "classe" (guerreiro tanque, mago nuker, etc) segue o gênero
// clássico de MMORPG — não copiamos números nem textos de nenhum jogo.

export type AbilityType = "damage" | "heal";

export interface Ability {
  name: string;
  type: AbilityType;
  power: number;       // dano ou cura base
  manaCost: number;
  cooldownMs: number;
  range: number;        // alcance em pixels
}

export interface ClassDef {
  key: string;
  label: string;
  color: number;         // cor do círculo do personagem (hex)
  baseHp: number;
  baseMana: number;
  basicAttackDamage: number;
  basicAttackRange: number;
  ability: Ability;
}

export const CLASSES: Record<string, ClassDef> = {
  warrior: {
    key: "warrior", label: "Guerreiro", color: 0xc79c6e,
    baseHp: 140, baseMana: 20, basicAttackDamage: 9, basicAttackRange: 50,
    ability: { name: "Golpe Poderoso", type: "damage", power: 22, manaCost: 0, cooldownMs: 4000, range: 50 },
  },
  paladin: {
    key: "paladin", label: "Paladino", color: 0xf58cba,
    baseHp: 130, baseMana: 60, basicAttackDamage: 8, basicAttackRange: 50,
    ability: { name: "Luz Purificadora", type: "heal", power: 30, manaCost: 25, cooldownMs: 6000, range: 0 },
  },
  hunter: {
    key: "hunter", label: "Caçador", color: 0xabd473,
    baseHp: 110, baseMana: 40, basicAttackDamage: 7, basicAttackRange: 220,
    ability: { name: "Tiro Certeiro", type: "damage", power: 26, manaCost: 15, cooldownMs: 5000, range: 220 },
  },
  rogue: {
    key: "rogue", label: "Ladino", color: 0xfff569,
    baseHp: 105, baseMana: 30, basicAttackDamage: 10, basicAttackRange: 45,
    ability: { name: "Facada Traiçoeira", type: "damage", power: 34, manaCost: 20, cooldownMs: 7000, range: 45 },
  },
  priest: {
    key: "priest", label: "Sacerdote", color: 0xffffff,
    baseHp: 95, baseMana: 90, basicAttackDamage: 5, basicAttackRange: 180,
    ability: { name: "Cura Menor", type: "heal", power: 28, manaCost: 20, cooldownMs: 4000, range: 0 },
  },
  shaman: {
    key: "shaman", label: "Xamã", color: 0x0070de,
    baseHp: 105, baseMana: 80, basicAttackDamage: 6, basicAttackRange: 180,
    ability: { name: "Onda de Cura", type: "heal", power: 24, manaCost: 18, cooldownMs: 4500, range: 0 },
  },
  mage: {
    key: "mage", label: "Mago", color: 0x69ccf0,
    baseHp: 90, baseMana: 100, basicAttackDamage: 5, basicAttackRange: 200,
    ability: { name: "Bola de Fogo", type: "damage", power: 32, manaCost: 25, cooldownMs: 4500, range: 200 },
  },
  warlock: {
    key: "warlock", label: "Bruxo", color: 0x9482c9,
    baseHp: 100, baseMana: 95, basicAttackDamage: 6, basicAttackRange: 190,
    ability: { name: "Drenar Vida", type: "damage", power: 20, manaCost: 20, cooldownMs: 3500, range: 190 },
  },
  druid: {
    key: "druid", label: "Druida", color: 0xff7d0a,
    baseHp: 115, baseMana: 70, basicAttackDamage: 8, basicAttackRange: 50,
    ability: { name: "Investida Selvagem", type: "damage", power: 24, manaCost: 15, cooldownMs: 5000, range: 50 },
  },
};

export const XP_TO_NEXT = (level: number) => Math.floor(50 * Math.pow(level, 1.5));
