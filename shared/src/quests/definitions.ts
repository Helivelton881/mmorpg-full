/** Quest definitions - V0.10 */

export type QuestObjectiveType = 'kill' | 'collect' | 'talk';

export interface QuestObjective {
  type: QuestObjectiveType;
  target: string;
  count: number;
  description: string;
}

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  giverNpcId: string;
  objectives: QuestObjective[];
  rewards: {
    experience: number;
    gold: number;
    items?: Array<{ itemId: string; quantity: number }>;
  };
  minLevel: number;
  requires?: string;
}

export const QUESTS: Record<string, QuestDef> = {
  q_slime_hunt: {
    id:'q_slime_hunt', name:'Ameaça Verde',
    description:'Os slimes estão invadindo os arredores da vila. Elimine 3 deles.',
    giverNpcId:'guard_vila', minLevel:1,
    objectives:[{ type:'kill', target:'slime', count:3, description:'Derrotar Slimes' }],
    rewards:{ experience:40, gold:30, items:[{ itemId:'potion_hp', quantity:2 }] },
  },
  q_collect_gel: {
    id:'q_collect_gel', name:'Gel Valioso',
    description:'O mercador precisa de gel de slime para poções. Traga 5 unidades.',
    giverNpcId:'merchant_vila', minLevel:1, requires:'q_slime_hunt',
    objectives:[{ type:'collect', target:'slime_gel', count:5, description:'Coletar Gel de Slime' }],
    rewards:{ experience:50, gold:40, items:[{ itemId:'sword_wood', quantity:1 }] },
  },
  q_wolf_threat: {
    id:'q_wolf_threat', name:'Lobos do Campo',
    description:'No Campo Aberto há lobos perigosos. Cace 2 e reporte ao caçador.',
    giverNpcId:'hunter_field', minLevel:1,
    objectives:[
      { type:'kill', target:'wolf', count:2, description:'Derrotar Lobos' },
      { type:'talk', target:'hunter_field', count:1, description:'Falar com Caçador Rena' },
    ],
    rewards:{ experience:80, gold:60, items:[{ itemId:'potion_mp', quantity:3 }] },
  },
  q_first_talk: {
    id:'q_first_talk', name:'Apresentação',
    description:'Converse com o Guarda Tomas na vila para conhecer a região.',
    giverNpcId:'guard_vila', minLevel:1,
    objectives:[{ type:'talk', target:'guard_vila', count:1, description:'Falar com Guarda Tomas' }],
    rewards:{ experience:15, gold:10, items:[{ itemId:'potion_hp', quantity:1 }] },
  },
  q_goblin_clear: {
    id:'q_goblin_clear', name:'Goblins na Floresta',
    description:'A Floresta Sombria está infestada de goblins. Elimine 4 deles.',
    giverNpcId:'hunter_field', minLevel:2, requires:'q_wolf_threat',
    objectives:[{ type:'kill', target:'goblin', count:4, description:'Derrotar Goblins' }],
    rewards:{ experience:100, gold:80, items:[{ itemId:'potion_hp', quantity:3 }] },
  },
  q_spider_silk: {
    id:'q_spider_silk', name:'Seda Preciosa',
    description:'Colete 3 Sedas de Aranha na Floresta Sombria.',
    giverNpcId:'merchant_vila', minLevel:2, requires:'q_goblin_clear',
    objectives:[{ type:'collect', target:'spider_silk', count:3, description:'Coletar Seda de Aranha' }],
    rewards:{ experience:120, gold:100, items:[{ itemId:'sword_steel', quantity:1 }] },
  },
  q_guardian_boss: {
    id:'q_guardian_boss', name:'O Guardião de Pedra',
    description:'Na Floresta há um portal para a Masmorra. Derrote o Guardião de Pedra e traga um Núcleo.',
    giverNpcId:'hunter_field', minLevel:3, requires:'q_spider_silk',
    objectives:[
      { type:'kill', target:'guardian', count:1, description:'Derrotar o Guardião de Pedra' },
      { type:'collect', target:'guardian_core', count:1, description:'Obter Núcleo do Guardião' },
    ],
    rewards:{ experience:350, gold:250, items:[{ itemId:'potion_hp', quantity:5 }] },
  },
};

export type QuestStatus = 'available' | 'active' | 'completed' | 'turned_in';

export interface QuestProgress {
  questId: string;
  status: QuestStatus;
  progress: number[];
}
