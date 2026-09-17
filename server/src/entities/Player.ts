import { Direction, InputPayload, ITEMS, InventorySlot, EquipmentState, SKILLS, MONSTER_DROPS, QUESTS, QuestProgress } from '@mmorpg/shared';
import { getMap } from '@mmorpg/shared';

const CLASS_STATS: Record<string, { hp:number; mp:number; atk:number; def:number; atkSpeed:number; range:number }> = {
  guerreiro:{hp:120,mp:30,atk:14,def:8,atkSpeed:0.9,range:48},
  barbaro:{hp:140,mp:20,atk:16,def:6,atkSpeed:1.0,range:52},
  paladino:{hp:130,mp:50,atk:12,def:10,atkSpeed:1.0,range:48},
  arqueiro:{hp:90,mp:40,atk:13,def:4,atkSpeed:0.7,range:140},
  ladino:{hp:85,mp:35,atk:15,def:3,atkSpeed:0.6,range:44},
  mago:{hp:70,mp:100,atk:18,def:2,atkSpeed:1.1,range:120},
  necromante:{hp:75,mp:110,atk:17,def:2,atkSpeed:1.2,range:110},
  clerigo:{hp:95,mp:90,atk:10,def:5,atkSpeed:1.0,range:100},
  monge:{hp:100,mp:60,atk:13,def:6,atkSpeed:0.75,range:42},
};

function xpToLevel(level:number):number { return Math.floor(50*Math.pow(level,1.6)); }

export class Player {
  id:string; characterId:string; name:string; className:string; mapId:string; x:number; y:number;
  direction:Direction='down'; speed=180;
  level=1; experience=0; hp:number; maxHp:number; mp:number; maxMp:number;
  baseAtk:number; baseDef:number; attackRange:number; attackCooldown:number; attackTimer=0;
  alive=true; respawnTimer=0; readonly respawnTime=5;
  gold=50; inventory:InventorySlot[]=[]; equipment:EquipmentState={weapon:null,armor:null};
  skillCooldowns:Record<string,number>={}; questLog:QuestProgress[]=[];
  private input:InputPayload={up:false,down:false,left:false,right:false,attack:false};
  private wantsAttack=false;

  constructor(
    socketId:string, characterId:string, name:string, className:string,
    x:number,y:number,mapId='starter',level=1,experience=0,gold=50,
    inventory:InventorySlot[]=[],equipment:EquipmentState={weapon:null,armor:null},
    questLog:QuestProgress[]=[]
  ) {
    this.id=socketId; this.characterId=characterId; this.name=name; this.className=className;
    this.x=x; this.y=y; this.mapId=mapId; this.level=level; this.experience=experience; this.gold=gold;
    this.inventory=inventory.length?inventory:[{itemId:'potion_hp',quantity:3},{itemId:'potion_mp',quantity:2}];
    this.equipment=equipment; this.questLog=questLog||[];
    const base=CLASS_STATS[className]||CLASS_STATS.guerreiro;
    const lvlBonus=(level-1)*8;
    this.maxHp=base.hp+lvlBonus; this.hp=this.maxHp;
    this.maxMp=base.mp+Math.floor(lvlBonus*0.5); this.mp=this.maxMp;
    this.baseAtk=base.atk+Math.floor((level-1)*1.5);
    this.baseDef=base.def+Math.floor((level-1)*0.8);
    this.attackRange=base.range; this.attackCooldown=base.atkSpeed;
  }

  get atk() {
    let v=this.baseAtk;
    if(this.equipment.weapon&&ITEMS[this.equipment.weapon]?.atkBonus)v+=ITEMS[this.equipment.weapon].atkBonus!;
    return v;
  }
  get def() {
    let v=this.baseDef;
    if(this.equipment.armor&&ITEMS[this.equipment.armor]?.defBonus)v+=ITEMS[this.equipment.armor].defBonus!;
    return v;
  }

  setInput(input:InputPayload){this.input=input;if(input.attack)this.wantsAttack=true;}

  update(dt:number):{mapId:string;x:number;y:number}|null {
    for(const k of Object.keys(this.skillCooldowns))this.skillCooldowns[k]=Math.max(0,this.skillCooldowns[k]-dt);
    if(!this.alive){this.respawnTimer-=dt;if(this.respawnTimer<=0)this.respawn();return null;}
    this.attackTimer=Math.max(0,this.attackTimer-dt);
    let dx=0,dy=0;
    if(this.input.up)dy--; if(this.input.down)dy++; if(this.input.left)dx--; if(this.input.right)dx++;
    if(dx!==0&&dy!==0){const len=Math.hypot(dx,dy);dx/=len;dy/=len;}
    if(dx>0)this.direction='right'; else if(dx<0)this.direction='left';
    else if(dy>0)this.direction='down'; else if(dy<0)this.direction='up'; else this.direction='none';
    const newX=this.x+dx*this.speed*dt,newY=this.y+dy*this.speed*dt;
    if(this.canMoveTo(newX,newY)){this.x=newX;this.y=newY;}
    else {if(this.canMoveTo(newX,this.y))this.x=newX;if(this.canMoveTo(this.x,newY))this.y=newY;}
    return this.checkPortal();
  }

  tryAttack(monsters:any[]):any|null {
    if(!this.alive||this.attackTimer>0||!this.wantsAttack){this.wantsAttack=false;return null;}
    let best:any=null,bestDist=Infinity;
    for(const m of monsters){
      if(m.mapId!==this.mapId||m.state==='dead')continue;
      const d=Math.hypot(m.x-this.x,m.y-this.y);
      if(d<=this.attackRange&&d<bestDist){bestDist=d;best=m;}
    }
    if(!best)return null;
    this.wantsAttack=false;this.attackTimer=this.attackCooldown;
    const damage=Math.max(1,this.atk+Math.floor(Math.random()*4));
    const killed=best.takeDamage(damage);
    return {targetId:best.id,damage,killed,targetHp:best.hp??0,targetMaxHp:best.maxHp??1};
  }

  useSkill(skillId:string,monsters:any[]):{ok:boolean;error?:string;damageEvents?:any[];heal?:number;skillId:string}{
    if(!this.alive)return{ok:false,error:'Você está morto',skillId};
    const skill=SKILLS[skillId];
    if(!skill)return{ok:false,error:'Habilidade inválida',skillId};
    if(!skill.classes.includes(this.className))return{ok:false,error:'Sua classe não usa esta habilidade',skillId};
    if((this.skillCooldowns[skillId]||0)>0)return{ok:false,error:'Em cooldown',skillId};
    if(this.mp<skill.manaCost)return{ok:false,error:'Mana insuficiente',skillId};
    this.mp-=skill.manaCost;this.skillCooldowns[skillId]=skill.cooldown;
    if(skill.id==='heal'){
      const healAmt=30+this.level*5;
      this.hp=Math.min(this.maxHp,this.hp+healAmt);
      return{ok:true,heal:healAmt,skillId,damageEvents:[]};
    }
    const damageEvents:any[]=[];
    const dmg=Math.max(1,Math.floor(this.atk*skill.damageMultiplier)+Math.floor(Math.random()*5));
    if(skill.aoe){
      const radius=skill.aoeRadius||80;
      for(const m of monsters){
        if(m.mapId!==this.mapId||m.state==='dead')continue;
        if(Math.hypot(m.x-this.x,m.y-this.y)<=radius){
          const killed=m.takeDamage(dmg);
          damageEvents.push({targetId:m.id,damage:dmg,killed,targetHp:m.hp,targetMaxHp:m.maxHp});
        }
      }
    } else {
      let best:any=null,bestDist=Infinity;
      for(const m of monsters){
        if(m.mapId!==this.mapId||m.state==='dead')continue;
        const d=Math.hypot(m.x-this.x,m.y-this.y);
        if(d<=skill.range&&d<bestDist){bestDist=d;best=m;}
      }
      if(best){
        const killed=best.takeDamage(dmg);
        damageEvents.push({targetId:best.id,damage:dmg,killed,targetHp:best.hp,targetMaxHp:best.maxHp});
      }
    }
    return{ok:true,skillId,damageEvents};
  }

  tryAttackPlayer(target:Player){
    if(!this.alive||this.attackTimer>0||!this.wantsAttack){this.wantsAttack=false;return null;}
    this.wantsAttack=false;this.attackTimer=this.attackCooldown;
    const d=Math.hypot(target.x-this.x,target.y-this.y);
    if(d>this.attackRange)return null;
    const damage=Math.max(1,this.atk+Math.floor(Math.random()*4));
    const killed=target.takeDamage(damage);
    return{damage,killed,targetHp:target.hp,targetMaxHp:target.maxHp};
  }

  takeDamage(amount:number){
    if(!this.alive)return false;
    const reduced=Math.max(1,amount-Math.floor(this.def*0.5));
    this.hp-=reduced;
    if(this.hp<=0){this.hp=0;this.alive=false;this.respawnTimer=this.respawnTime;return true;}
    return false;
  }

  addExperience(amount:number){
    this.experience+=amount;let leveled=false;
    while(this.experience>=xpToLevel(this.level)){
      this.experience-=xpToLevel(this.level);this.level++;leveled=true;
      this.maxHp+=8;this.maxMp+=4;this.baseAtk++;this.baseDef++;this.hp=this.maxHp;this.mp=this.maxMp;
    }
    return{leveled,level:this.level,experience:this.experience};
  }

  applyDrops(monsterType:string):{items:InventorySlot[];gold:number}{
    const table=MONSTER_DROPS[monsterType]||[];const gained:InventorySlot[]=[];let gold=0;
    for(const entry of table){
      if(Math.random()<=entry.chance){
        const qty=entry.min+Math.floor(Math.random()*(entry.max-entry.min+1));
        this.addItem(entry.itemId,qty);gained.push({itemId:entry.itemId,quantity:qty});
      }
      if(entry.goldMax>0)gold+=entry.goldMin+Math.floor(Math.random()*(entry.goldMax-entry.goldMin+1));
    }
    this.gold+=gold;return{items:gained,gold};
  }

  addItem(itemId:string,quantity:number){
    const def=ITEMS[itemId];if(!def)return false;
    if(def.stackable){
      const existing=this.inventory.find(s=>s.itemId===itemId);
      if(existing){existing.quantity=Math.min(def.maxStack,existing.quantity+quantity);return true;}
    }
    if(this.inventory.length>=20)return false;
    this.inventory.push({itemId,quantity});return true;
  }

  removeItem(itemId:string,quantity:number){
    const slot=this.inventory.find(s=>s.itemId===itemId);
    if(!slot||slot.quantity<quantity)return false;
    slot.quantity-=quantity;
    if(slot.quantity<=0)this.inventory=this.inventory.filter(s=>s.itemId!==itemId);
    return true;
  }

  useItem(itemId:string){
    if(!this.alive)return{ok:false,error:'Você está morto'};
    const def=ITEMS[itemId];
    if(!def||def.type!=='potion')return{ok:false,error:'Não é consumível'};
    if(!this.removeItem(itemId,1))return{ok:false,error:'Item não encontrado'};
    if(def.hpRestore)this.hp=Math.min(this.maxHp,this.hp+def.hpRestore);
    if(def.mpRestore)this.mp=Math.min(this.maxMp,this.mp+def.mpRestore);
    return{ok:true};
  }

  equipItem(itemId:string){
    const def=ITEMS[itemId];
    if(!def||def.slot==='none')return{ok:false,error:'Não equipável'};
    if(!this.inventory.find(s=>s.itemId===itemId))return{ok:false,error:'Item não está no inventário'};
    const slot=def.slot as 'weapon'|'armor';
    if(this.equipment[slot])this.addItem(this.equipment[slot]!,1);
    this.removeItem(itemId,1);this.equipment[slot]=itemId;return{ok:true};
  }

  unequipItem(slot:'weapon'|'armor'){
    if(!this.equipment[slot])return{ok:false,error:'Nada equipado'};
    if(this.inventory.length>=20)return{ok:false,error:'Inventário cheio'};
    this.addItem(this.equipment[slot]!,1);this.equipment[slot]=null;return{ok:true};
  }

  buyItem(itemId:string){
    const def=ITEMS[itemId];if(!def)return{ok:false,error:'Item inválido'};
    if(this.gold<def.price)return{ok:false,error:'Ouro insuficiente'};
    if(!this.addItem(itemId,1))return{ok:false,error:'Inventário cheio'};
    this.gold-=def.price;return{ok:true};
  }

  sellItem(itemId:string,quantity=1){
    const def=ITEMS[itemId];if(!def)return{ok:false,error:'Item inválido'};
    if(!this.removeItem(itemId,quantity))return{ok:false,error:'Sem itens suficientes'};
    this.gold+=Math.floor(def.price/2)*quantity;return{ok:true};
  }

  private respawn(){
    const map=getMap(this.mapId),spawn=map.spawns[0]||{x:400,y:400};
    this.x=spawn.x;this.y=spawn.y;this.hp=this.maxHp;this.mp=this.maxMp;this.alive=true;this.respawnTimer=0;
  }

  private canMoveTo(px:number,py:number){
    const map=getMap(this.mapId),ts=map.tileSize,half=12;
    for(const p of [{x:px-half,y:py-half},{x:px+half,y:py-half},{x:px-half,y:py+half},{x:px+half,y:py+half}]){
      const tx=Math.floor(p.x/ts),ty=Math.floor(p.y/ts);
      if(tx<0||ty<0||tx>=map.width||ty>=map.height)return false;
      if(map.collision[ty][tx])return false;
    }
    return true;
  }

  private checkPortal(){
    const map=getMap(this.mapId),ts=map.tileSize;
    const tx=Math.floor(this.x/ts),ty=Math.floor(this.y/ts);
    for(const portal of map.portals){
      if(Math.abs(portal.x-tx)<=1&&Math.abs(portal.y-ty)<=1)
        return{mapId:portal.targetMap,x:portal.targetX,y:portal.targetY};
    }
    return null;
  }

  acceptQuest(questId:string){
    const def=QUESTS[questId];
    if(!def)return{ok:false,error:'Missão inválida'};
    if(this.level<def.minLevel)return{ok:false,error:`Requer nível ${def.minLevel}`};
    if(def.requires){
      const pre=this.questLog.find(q=>q.questId===def.requires);
      if(!pre||pre.status!=='turned_in')return{ok:false,error:'Complete a missão anterior primeiro'};
    }
    const existing=this.questLog.find(q=>q.questId===questId);
    if(existing&&existing.status!=='available')return{ok:false,error:'Missão já aceita ou concluída'};
    this.questLog=this.questLog.filter(q=>q.questId!==questId);
    this.questLog.push({questId,status:'active',progress:def.objectives.map(()=>0)});
    return{ok:true};
  }

  onKill(monsterType:string){
    for(const q of this.questLog){
      if(q.status!=='active')continue;
      const def=QUESTS[q.questId];if(!def)continue;
      def.objectives.forEach((obj,i)=>{
        if(obj.type==='kill'&&obj.target===monsterType)q.progress[i]=Math.min(obj.count,(q.progress[i]||0)+1);
      });
      this.checkQuestComplete(q);
    }
  }

  syncCollectObjectives(){
    for(const q of this.questLog){
      if(q.status!=='active')continue;
      const def=QUESTS[q.questId];if(!def)continue;
      def.objectives.forEach((obj,i)=>{
        if(obj.type==='collect'){
          const slot=this.inventory.find(s=>s.itemId===obj.target);
          q.progress[i]=Math.min(obj.count,slot?.quantity||0);
        }
      });
      this.checkQuestComplete(q);
    }
  }

  onTalk(npcId:string){
    for(const q of this.questLog){
      if(q.status!=='active')continue;
      const def=QUESTS[q.questId];if(!def)continue;
      def.objectives.forEach((obj,i)=>{
        if(obj.type==='talk'&&obj.target===npcId)q.progress[i]=Math.min(obj.count,(q.progress[i]||0)+1);
      });
      this.checkQuestComplete(q);
    }
  }

  private checkQuestComplete(q:QuestProgress){
    const def=QUESTS[q.questId];if(!def)return;
    if(def.objectives.every((obj,i)=>(q.progress[i]||0)>=obj.count))q.status='completed';
  }

  turnInQuest(questId:string){
    const q=this.questLog.find(x=>x.questId===questId);
    if(!q||q.status!=='completed')return{ok:false,error:'Missão não está pronta para entregar'};
    const def=QUESTS[questId];if(!def)return{ok:false,error:'Missão inválida'};
    for(const obj of def.objectives){
      if(obj.type==='collect'&&!this.removeItem(obj.target,obj.count))
        return{ok:false,error:`Faltam itens: ${obj.target}`};
    }
    const lvl=this.addExperience(def.rewards.experience);this.gold+=def.rewards.gold;
    if(def.rewards.items)for(const it of def.rewards.items)this.addItem(it.itemId,it.quantity);
    q.status='turned_in';
    return{ok:true,rewards:{
      experience:def.rewards.experience,gold:def.rewards.gold,items:def.rewards.items,
      levelUp:lvl.leveled?{level:this.level,experience:this.experience,maxHp:this.maxHp,maxMp:this.maxMp}:null,
    }};
  }

  getQuestPayload(){
    const active=this.questLog
      .filter(q=>q.status==='active'||q.status==='completed')
      .map(q=>{
        const def=QUESTS[q.questId];
        return{questId:q.questId,status:q.status,progress:q.progress,name:def?.name,description:def?.description,
          objectives:def?.objectives.map((obj,i)=>({
            description:obj.description,current:q.progress[i]||0,required:obj.count,type:obj.type,
          }))};
      });
    const available=Object.values(QUESTS)
      .filter(def=>{
        if(this.level<def.minLevel)return false;
        const existing=this.questLog.find(q=>q.questId===def.id);
        if(existing&&existing.status!=='available')return false;
        if(def.requires){
          const pre=this.questLog.find(q=>q.questId===def.requires);
          if(!pre||pre.status!=='turned_in')return false;
        }
        return true;
      })
      .map(def=>({id:def.id,name:def.name,description:def.description,minLevel:def.minLevel}));
    return{quests:active,available};
  }

  toState(){
    return{id:this.id,name:this.name,x:this.x,y:this.y,direction:this.direction,className:this.className,mapId:this.mapId,
      hp:this.hp,maxHp:this.maxHp,mp:this.mp,maxMp:this.maxMp,level:this.level,alive:this.alive};
  }
  toInventoryPayload(){return{inventory:this.inventory,equipment:this.equipment,gold:this.gold};}
}
