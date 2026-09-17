/** NPC definitions - V0.8 */

export interface NpcDef {
  id: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
  type: 'shop' | 'dialog';
  dialog: string[];
  shopItems?: string[];
}

export const NPCS: NpcDef[] = [
  {
    id: 'merchant_vila',
    name: 'Mercador Aldo',
    mapId: 'starter',
    x: 480,
    y: 320,
    type: 'shop',
    dialog: [
      'Bem-vindo à minha loja, aventureiro!',
      'Tenho armas, armaduras e poções.',
      'O que deseja comprar ou vender?',
    ],
    shopItems: [
      'sword_wood', 'sword_iron', 'bow_hunting', 'staff_apprentice',
      'armor_leather', 'armor_chain', 'potion_hp', 'potion_mp', 'sword_steel',
    ],
  },
  {
    id: 'guard_vila',
    name: 'Guarda Tomas',
    mapId: 'starter',
    x: 320,
    y: 480,
    type: 'dialog',
    dialog: [
      'Mantenha a vila segura.',
      'Há slimes nos arredores e lobos no campo.',
      'Use o portal roxo a leste para chegar ao Campo Aberto.',
    ],
  },
  {
    id: 'hunter_field',
    name: 'Caçador Rena',
    mapId: 'field',
    x: 200,
    y: 520,
    type: 'shop',
    dialog: [
      'Os lobos por aqui são ferozes.',
      'Posso te vender algumas poções.',
    ],
    shopItems: ['potion_hp', 'potion_mp', 'bow_hunting'],
  },
];
