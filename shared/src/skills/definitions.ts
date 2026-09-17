/** Skill definitions - V0.9 */

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  manaCost: number;
  cooldown: number; // seconds
  damageMultiplier: number; // times atk
  range: number;
  aoe: boolean;
  aoeRadius?: number;
  /** Classes that can use this skill */
  classes: string[];
  key: string; // display key
}

export const SKILLS: Record<string, SkillDef> = {
  power_strike: {
    id: 'power_strike', name: 'Golpe Poderoso', description: 'Ataque forte corpo a corpo.',
    manaCost: 8, cooldown: 3, damageMultiplier: 1.8, range: 52, aoe: false,
    classes: ['guerreiro', 'barbaro', 'paladino', 'monge'], key: '1',
  },
  whirlwind: {
    id: 'whirlwind', name: 'Redemoinho', description: 'Dano em área ao redor.',
    manaCost: 18, cooldown: 6, damageMultiplier: 1.2, range: 0, aoe: true, aoeRadius: 80,
    classes: ['guerreiro', 'barbaro'], key: '2',
  },
  precise_shot: {
    id: 'precise_shot', name: 'Tiro Preciso', description: 'Disparo à distância.',
    manaCost: 10, cooldown: 2.5, damageMultiplier: 1.6, range: 160, aoe: false,
    classes: ['arqueiro', 'ladino'], key: '1',
  },
  fireball: {
    id: 'fireball', name: 'Bola de Fogo', description: 'Projétil mágico de fogo.',
    manaCost: 15, cooldown: 3.5, damageMultiplier: 2.0, range: 150, aoe: false,
    classes: ['mago', 'necromante'], key: '1',
  },
  frost_nova: {
    id: 'frost_nova', name: 'Nova de Gelo', description: 'Explosão de gelo em área.',
    manaCost: 22, cooldown: 7, damageMultiplier: 1.3, range: 0, aoe: true, aoeRadius: 90,
    classes: ['mago'], key: '2',
  },
  holy_smite: {
    id: 'holy_smite', name: 'Golpe Sagrado', description: 'Ataque sagrado.',
    manaCost: 12, cooldown: 3, damageMultiplier: 1.7, range: 110, aoe: false,
    classes: ['clerigo', 'paladino'], key: '1',
  },
  heal: {
    id: 'heal', name: 'Cura', description: 'Restaura HP próprio.',
    manaCost: 20, cooldown: 8, damageMultiplier: 0, range: 0, aoe: false,
    classes: ['clerigo', 'paladino'], key: '2',
  },
  shadow_strike: {
    id: 'shadow_strike', name: 'Golpe Sombrio', description: 'Ataque furtivo crítico.',
    manaCost: 12, cooldown: 4, damageMultiplier: 2.2, range: 48, aoe: false,
    classes: ['ladino', 'necromante'], key: '2',
  },
  chi_punch: {
    id: 'chi_punch', name: 'Soco de Chi', description: 'Golpe de energia.',
    manaCost: 10, cooldown: 2.5, damageMultiplier: 1.5, range: 46, aoe: false,
    classes: ['monge'], key: '1',
  },
};

export function getSkillsForClass(className: string): SkillDef[] {
  return Object.values(SKILLS).filter((s) => s.classes.includes(className));
}
