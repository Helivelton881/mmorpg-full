/** Item definitions - V0.7 */

export type ItemType = 'weapon' | 'armor' | 'potion' | 'misc';
export type EquipSlot = 'weapon' | 'armor' | 'none';

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  slot: EquipSlot;
  stackable: boolean;
  maxStack: number;
  atkBonus?: number;
  defBonus?: number;
  hpRestore?: number;
  mpRestore?: number;
  price: number;
  description: string;
}

export const ITEMS: Record<string, ItemDef> = {
  sword_wood: { id:'sword_wood', name:'Espada de Madeira', type:'weapon', slot:'weapon', stackable:false, maxStack:1, atkBonus:3, price:25, description:'Uma espada simples de madeira.' },
  sword_iron: { id:'sword_iron', name:'Espada de Ferro', type:'weapon', slot:'weapon', stackable:false, maxStack:1, atkBonus:8, price:80, description:'Espada de ferro bem forjada.' },
  bow_hunting: { id:'bow_hunting', name:'Arco de Caça', type:'weapon', slot:'weapon', stackable:false, maxStack:1, atkBonus:6, price:60, description:'Arco leve para caçadores.' },
  staff_apprentice: { id:'staff_apprentice', name:'Cajado de Aprendiz', type:'weapon', slot:'weapon', stackable:false, maxStack:1, atkBonus:7, price:70, description:'Cajado básico de mago.' },
  armor_leather: { id:'armor_leather', name:'Armadura de Couro', type:'armor', slot:'armor', stackable:false, maxStack:1, defBonus:4, price:50, description:'Proteção leve de couro.' },
  armor_chain: { id:'armor_chain', name:'Cota de Malha', type:'armor', slot:'armor', stackable:false, maxStack:1, defBonus:9, price:120, description:'Armadura de malha resistente.' },
  potion_hp: { id:'potion_hp', name:'Poção de Vida', type:'potion', slot:'none', stackable:true, maxStack:20, hpRestore:40, price:15, description:'Restaura 40 de HP.' },
  potion_mp: { id:'potion_mp', name:'Poção de Mana', type:'potion', slot:'none', stackable:true, maxStack:20, mpRestore:30, price:15, description:'Restaura 30 de MP.' },
  slime_gel: { id:'slime_gel', name:'Gel de Slime', type:'misc', slot:'none', stackable:true, maxStack:50, price:3, description:'Resíduo pegajoso de slime.' },
  wolf_fang: { id:'wolf_fang', name:'Presa de Lobo', type:'misc', slot:'none', stackable:true, maxStack:30, price:8, description:'Presa afiada de lobo.' },
  goblin_ear: { id:'goblin_ear', name:'Orelha de Goblin', type:'misc', slot:'none', stackable:true, maxStack:40, price:5, description:'Troféu de caça a goblins.' },
  spider_silk: { id:'spider_silk', name:'Seda de Aranha', type:'misc', slot:'none', stackable:true, maxStack:25, price:12, description:'Seda resistente e valiosa.' },
  sword_steel: { id:'sword_steel', name:'Espada de Aço', type:'weapon', slot:'weapon', stackable:false, maxStack:1, atkBonus:14, price:200, description:'Espada de aço bem equilibrada.' },
  bone_shard: { id:'bone_shard', name:'Fragmento de Osso', type:'misc', slot:'none', stackable:true, maxStack:40, price:15, description:'Osso antigo de esqueleto.' },
  guardian_core: { id:'guardian_core', name:'Núcleo do Guardião', type:'misc', slot:'none', stackable:true, maxStack:5, price:150, description:'Núcleo mágico do Guardião de Pedra.' },
  sword_guardian: { id:'sword_guardian', name:'Lâmina do Guardião', type:'weapon', slot:'weapon', stackable:false, maxStack:1, atkBonus:22, price:500, description:'Arma lendária forjada na masmorra.' },
  armor_guardian: { id:'armor_guardian', name:'Couraça de Pedra', type:'armor', slot:'armor', stackable:false, maxStack:1, defBonus:16, price:450, description:'Armadura pesada do Guardião.' },
};

export interface InventorySlot { itemId: string; quantity: number; }
export interface EquipmentState { weapon: string | null; armor: string | null; }

export const MONSTER_DROPS: Record<string, Array<{ itemId: string; chance: number; min: number; max: number; goldMin: number; goldMax: number }>> = {
  slime: [
    { itemId:'slime_gel', chance:0.7, min:1, max:3, goldMin:2, goldMax:6 },
    { itemId:'potion_hp', chance:0.15, min:1, max:1, goldMin:0, goldMax:0 },
  ],
  wolf: [
    { itemId:'wolf_fang', chance:0.55, min:1, max:2, goldMin:5, goldMax:14 },
    { itemId:'potion_hp', chance:0.2, min:1, max:1, goldMin:0, goldMax:0 },
    { itemId:'armor_leather', chance:0.05, min:1, max:1, goldMin:0, goldMax:0 },
  ],
  goblin: [
    { itemId:'goblin_ear', chance:0.65, min:1, max:2, goldMin:4, goldMax:12 },
    { itemId:'potion_hp', chance:0.18, min:1, max:1, goldMin:0, goldMax:0 },
    { itemId:'sword_wood', chance:0.08, min:1, max:1, goldMin:0, goldMax:0 },
  ],
  spider: [
    { itemId:'spider_silk', chance:0.5, min:1, max:2, goldMin:8, goldMax:20 },
    { itemId:'potion_mp', chance:0.22, min:1, max:1, goldMin:0, goldMax:0 },
    { itemId:'armor_chain', chance:0.04, min:1, max:1, goldMin:0, goldMax:0 },
  ],
  skeleton: [
    { itemId:'bone_shard', chance:0.7, min:1, max:3, goldMin:10, goldMax:25 },
    { itemId:'potion_hp', chance:0.2, min:1, max:1, goldMin:0, goldMax:0 },
    { itemId:'sword_iron', chance:0.06, min:1, max:1, goldMin:0, goldMax:0 },
  ],
  guardian: [
    { itemId:'guardian_core', chance:1.0, min:1, max:1, goldMin:80, goldMax:150 },
    { itemId:'sword_guardian', chance:0.25, min:1, max:1, goldMin:0, goldMax:0 },
    { itemId:'armor_guardian', chance:0.2, min:1, max:1, goldMin:0, goldMax:0 },
    { itemId:'potion_hp', chance:0.5, min:2, max:4, goldMin:0, goldMax:0 },
  ],
};
