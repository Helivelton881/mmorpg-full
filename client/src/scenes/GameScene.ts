import Phaser from 'phaser';
import { network } from '../network/NetworkManager';
import { PlayerEntity, CharacterClass } from '../entities/PlayerEntity';
import { MonsterEntity } from '../entities/MonsterEntity';
import {
  InputPayload, WelcomePayload, PlayerUpdatePayload, MapChangePayload,
  MonsterState, CombatEventPayload, LevelUpPayload, getMap, MapDefinition,
  NPCS, ITEMS, getSkillsForClass,
} from '@mmorpg/shared';
import { sfx } from '../audio/SoundManager';
import { MobileControls } from '../mobile/MobileControls';

const CLASSES: CharacterClass[] = [
  'guerreiro','arqueiro','mago','clerigo','paladino',
  'ladino','barbaro','monge','necromante',
];

export class GameScene extends Phaser.Scene {
  private localPlayerId: string | null = null;
  private players = new Map<string, PlayerEntity>();
  private monsters = new Map<string, MonsterEntity>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastInput: InputPayload = { up:false,down:false,left:false,right:false,attack:false };
  private currentMapId = 'starter';
  private mapDef: MapDefinition = getMap('starter');
  private mapLayer: Phaser.GameObjects.Graphics | null = null;
  private localClass: CharacterClass = 'guerreiro';
  private hp = 100; private maxHp = 100;
  private mp = 50; private maxMp = 50;
  private level = 1; private experience = 0; private gold = 0;
  private inventory: Array<{itemId:string;quantity:number}> = [];
  private equipment: {weapon:string|null;armor:string|null} = {weapon:null,armor:null};
  private hud!: Phaser.GameObjects.Text;
  private mapText!: Phaser.GameObjects.Text;
  private playerCountText!: Phaser.GameObjects.Text;
  private mobile!: MobileControls;
  private questData: any = { quests:[], available:[] };
  private chatLog: HTMLDivElement | null = null;
  private chatInput: HTMLInputElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private npcGraphics: Phaser.GameObjects.Container[] = [];

  constructor() { super({ key:'GameScene' }); }
  preload() {}

  private ensureClassTextures() {
    const colors:Record<CharacterClass,number> = {
      guerreiro:0x64748b, arqueiro:0x16a34a, mago:0x2563eb, clerigo:0xf59e0b,
      paladino:0xeab308, ladino:0x7c3aed, barbaro:0xdc2626, monge:0xea580c, necromante:0x6b21a8,
    };
    for (const cls of CLASSES) {
      const key=`char_${cls}`;
      if (this.textures.exists(key)) continue;
      const g=this.add.graphics();
      g.fillStyle(colors[cls],1); g.fillCircle(32,32,26);
      g.lineStyle(3,0xf8fafc,0.9); g.strokeCircle(32,32,26);
      g.generateTexture(key,64,64); g.destroy();
    }
  }

  create() {
    this.ensureClassTextures();
    this.cursors=this.input.keyboard!.createCursorKeys();
    this.wasd={
      up:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.keys={
      attack:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      interact:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      inv:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      quest:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      skill1:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      skill2:this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
    };

    this.renderMap('starter');
    this.createHud();
    this.setupChat();

    network.onWelcome(d=>this.onWelcome(d));
    network.onPlayersSnapshot(d=>this.onPlayersSnapshot(d));
    network.onPlayerUpdate(d=>this.onPlayerUpdate(d));
    network.onPlayerLeft(d=>this.onPlayerLeft(d.id));
    network.onMapChange(d=>this.onMapChange(d));
    network.onMonstersSnapshot(d=>this.onMonstersSnapshot(d));
    network.onMonsterUpdate(d=>this.onMonsterUpdate(d));
    network.onCombatEvent(d=>this.onCombatEvent(d));
    network.onLevelUp(d=>this.onLevelUp(d));
    network.onPlayerDied(d=>this.players.get(d.id)?.setAlive(false));
    network.onPlayerRespawned(d=>{
      const p=this.players.get(d.id);
      if(p){p.setAlive(true);p.setTarget(d.x,d.y);p.setHp(d.hp,d.maxHp);}
    });
    network.onInventoryUpdate((d:any)=>{
      this.inventory=d.inventory||[];this.equipment=d.equipment||this.equipment;this.gold=d.gold??this.gold;this.refreshHud();
    });
    network.onGoldUpdate(d=>{this.gold=d.gold;this.refreshHud();});
    network.onQuestList(d=>{this.questData=d;});
    network.onQuestUpdate(d=>{this.questData=d;});
    network.onNpcDialog((d:any)=>this.showOverlay(`${d.name}\n\n${(d.dialog||[]).join('\n')}`));
    network.onShopOpen((d:any)=>this.showShop(d));
    network.onActionResult(d=>{if(!d.ok&&d.error)this.flashStatus(d.error);});
    network.onChatMessage((d:any)=>this.appendChat(`[${d.channel}] ${d.from}: ${d.text}`));
    network.onChatSystem((d:any)=>this.appendChat(`[Sistema] ${d.text}`));
    network.onSkillUsed(()=>sfx.play('skill'));

    sfx.loadPrefs();
    this.mobile=new MobileControls();
    if(MobileControls.isTouchDevice()){
      this.mobile.enable(action=>this.mobileAction(action));
    }
    this.input.once('pointerdown',()=>sfx.play('ui'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.cleanupHtml());
  }

  private createHud() {
    const cam=this.cameras.main;
    this.hud=this.add.text(12,42,'',{fontFamily:'monospace',fontSize:'13px',color:'#f8fafc',backgroundColor:'#00000099',padding:{x:8,y:6}})
      .setScrollFactor(0).setDepth(1000);
    this.mapText=this.add.text(cam.width/2,12,'',{fontFamily:'monospace',fontSize:'14px',color:'#fbbf24',backgroundColor:'#00000088',padding:{x:8,y:4}})
      .setOrigin(0.5,0).setScrollFactor(0).setDepth(1000);
    this.playerCountText=this.add.text(cam.width-12,12,'',{fontFamily:'monospace',fontSize:'12px',color:'#cbd5e1',backgroundColor:'#00000088',padding:{x:6,y:4}})
      .setOrigin(1,0).setScrollFactor(0).setDepth(1000);
    this.scale.on('resize',(size:Phaser.Structs.Size)=>{
      this.mapText.setX(size.width/2);this.playerCountText.setX(size.width-12);
    });
    this.refreshHud();
  }

  private refreshHud(){
    if(!this.hud)return;
    const xpNeed=Math.floor(50*Math.pow(this.level,1.6));
    this.hud.setText([
      `Nv.${this.level}  HP ${Math.max(0,Math.floor(this.hp))}/${this.maxHp}  MP ${Math.floor(this.mp)}/${this.maxMp}`,
      `XP ${this.experience}/${xpNeed}  Ouro ${this.gold}`,
      MobileControls.isTouchDevice()?'ATK • 1/2 habilidades • I inventário':'WASD mover • ESPAÇO atacar • E NPC • I inventário • Q missões • 1/2 skills',
    ]);
    this.mapText?.setText(this.mapDef.name);
    this.playerCountText?.setText(`Online: ${this.players.size}`);
  }

  private renderMap(mapId:string){
    this.currentMapId=mapId;this.mapDef=getMap(mapId);
    this.mapLayer?.destroy();
    const g=this.add.graphics().setDepth(0);this.mapLayer=g;
    const palettes:Record<string,Record<number,number>>={
      starter:{0:0x3d8b40,1:0x6b4f2a,2:0x2a6db5,3:0xc2a15a,4:0x9b59b6},
      field:{0:0x4a9a45,1:0x5a4030,2:0x3a7a35,3:0xb8956a,4:0x9b59b6},
      forest:{0:0x1a4d2e,1:0x2d1f14,2:0x0f3d28,3:0x3d5c3a,4:0x9b59b6},
      dungeon:{0:0x292524,1:0x1c1917,2:0x44403c,3:0x57534e,4:0x7c3aed,5:0x44403c},
    };
    const colors=palettes[mapId]||palettes.starter,ts=this.mapDef.tileSize;
    const portals=new Set(this.mapDef.portals.map(p=>`${p.x},${p.y}`));
    for(let y=0;y<this.mapDef.height;y++){
      for(let x=0;x<this.mapDef.width;x++){
        let tile=this.mapDef.tiles[y][x];if(portals.has(`${x},${y}`))tile=4;
        g.fillStyle(colors[tile]??colors[0],1);g.fillRect(x*ts,y*ts,ts,ts);
        if(tile===4){g.lineStyle(2,0xe879f9,0.9);g.strokeRect(x*ts+2,y*ts+2,ts-4,ts-4);}
      }
    }
    this.cameras.main.setBounds(0,0,this.mapDef.width*ts,this.mapDef.height*ts);
    this.spawnNpcs();
    if(this.mapText)this.refreshHud();
  }

  private spawnNpcs(){
    for(const c of this.npcGraphics)c.destroy();this.npcGraphics=[];
    for(const npc of NPCS.filter(n=>n.mapId===this.currentMapId)){
      const c=this.add.container(npc.x,npc.y).setDepth(8);
      const body=this.add.rectangle(0,0,24,30,npc.type==='shop'?0xf59e0b:0x38bdf8).setStrokeStyle(2,0xffffff,0.6);
      const label=this.add.text(0,-23,npc.name,{fontFamily:'monospace',fontSize:'10px',color:'#fff',backgroundColor:'#000000bb',padding:{x:3,y:1}}).setOrigin(0.5,1);
      c.add([body,label]);this.npcGraphics.push(c);
    }
  }

  private onWelcome(d:WelcomePayload){
    this.localPlayerId=d.id;this.localClass=(d.className||'guerreiro') as CharacterClass;
    this.hp=d.hp??100;this.maxHp=d.maxHp??100;this.mp=d.mp??50;this.maxMp=d.maxMp??50;
    this.level=d.level??1;this.experience=d.experience??0;this.gold=d.gold??0;
    this.inventory=d.inventory||[];this.equipment=d.equipment||this.equipment;
    if((d.mapId||'starter')!==this.currentMapId)this.renderMap(d.mapId||'starter');
    this.upsertPlayer({id:d.id,name:d.name,x:d.x,y:d.y,direction:'down',className:d.className,mapId:d.mapId,hp:d.hp,maxHp:d.maxHp,mp:d.mp,maxMp:d.maxMp,level:d.level,alive:true});
    const local=this.players.get(d.id);
    if(local)this.cameras.main.startFollow(local.sprite,true,0.12,0.12);
    this.refreshHud();
  }

  private upsertPlayer(d:PlayerUpdatePayload){
    if(d.mapId&&d.mapId!==this.currentMapId){
      const old=this.players.get(d.id);if(old){old.destroy();this.players.delete(d.id);}return;
    }
    let p=this.players.get(d.id);
    if(!p){
      p=new PlayerEntity(this,d.id,d.name,d.x,d.y,d.id===this.localPlayerId,(d.className||'guerreiro') as CharacterClass);
      this.players.set(d.id,p);
    }
    p.setName(d.name);p.setTarget(d.x,d.y,d.direction);
    if(d.hp!=null&&d.maxHp!=null)p.setHp(d.hp,d.maxHp);
    if(d.alive!=null)p.setAlive(d.alive);
    if(d.id===this.localPlayerId){
      this.hp=d.hp??this.hp;this.maxHp=d.maxHp??this.maxHp;this.mp=d.mp??this.mp;this.maxMp=d.maxMp??this.maxMp;this.level=d.level??this.level;
    }
  }

  private onPlayersSnapshot(list:PlayerUpdatePayload[]){
    const keep=new Set(list.map(p=>p.id));
    for(const [id,p] of this.players){if(!keep.has(id)){p.destroy();this.players.delete(id);}}
    for(const p of list)this.upsertPlayer(p);
    this.refreshHud();
  }
  private onPlayerUpdate(data:PlayerUpdatePayload[]|PlayerUpdatePayload){
    for(const p of (Array.isArray(data)?data:[data]))this.upsertPlayer(p);
    this.refreshHud();
  }
  private onPlayerLeft(id:string){this.players.get(id)?.destroy();this.players.delete(id);this.refreshHud();}

  private onMapChange(d:MapChangePayload){
    this.renderMap(d.mapId);
    for(const p of this.players.values())p.destroy();this.players.clear();
    for(const m of this.monsters.values())m.destroy();this.monsters.clear();
    sfx.play('portal');
  }

  private onMonstersSnapshot(list:MonsterState[]){
    for(const m of this.monsters.values())m.destroy();this.monsters.clear();
    for(const d of list){if(d.mapId===this.currentMapId)this.monsters.set(d.id,new MonsterEntity(this,d));}
  }
  private onMonsterUpdate(data:MonsterState[]|MonsterState){
    for(const d of (Array.isArray(data)?data:[data])){
      if(d.mapId!==this.currentMapId){this.monsters.get(d.id)?.destroy();this.monsters.delete(d.id);continue;}
      let m=this.monsters.get(d.id);
      if(!m){m=new MonsterEntity(this,d);this.monsters.set(d.id,m);}else m.applyState(d);
    }
  }

  private onCombatEvent(d:CombatEventPayload){
    if(d.isMonsterTarget){
      this.monsters.get(d.targetId)?.applyState({
        id:d.targetId,type:this.monsters.get(d.targetId)?.type||'slime',
        name:this.monsters.get(d.targetId)?.name||'Monstro',x:this.monsters.get(d.targetId)?.sprite.x||0,
        y:this.monsters.get(d.targetId)?.sprite.y||0,hp:d.targetHp,maxHp:d.targetMaxHp,mapId:this.currentMapId,
        state:d.killed?'dead':'attack',
      });
    } else {
      const p=this.players.get(d.targetId);p?.setHp(d.targetHp,d.targetMaxHp);
      if(d.targetId===this.localPlayerId){this.hp=d.targetHp;this.maxHp=d.targetMaxHp;this.refreshHud();}
    }
    sfx.play(d.killed?'kill':'hit');
  }

  private onLevelUp(d:LevelUpPayload){
    this.level=d.level;this.experience=d.experience;this.maxHp=d.maxHp;this.maxMp=d.maxMp;
    this.hp=this.maxHp;this.mp=this.maxMp;sfx.play('levelup');this.flashStatus(`Nível ${d.level}!`);this.refreshHud();
  }

  private nearestNpc(){
    if(!this.localPlayerId)return null;
    const p=this.players.get(this.localPlayerId);if(!p)return null;
    let best:any=null,dist=Infinity;
    for(const npc of NPCS.filter(n=>n.mapId===this.currentMapId)){
      const d=Math.hypot(npc.x-p.sprite.x,npc.y-p.sprite.y);
      if(d<dist){dist=d;best=npc;}
    }
    return dist<=90?best:null;
  }

  private interactNpc(){const npc=this.nearestNpc();if(npc)network.interactNpc(npc.id);else this.flashStatus('Nenhum NPC próximo');}
  private useSkill(index:number){
    const skills=getSkillsForClass(this.localClass);
    if(skills[index])network.useSkill(skills[index].id);
  }

  private mobileAction(action:string){
    if(action==='inv')this.showInventory();
    else if(action==='quest')this.showQuests();
    else if(action==='npc')this.interactNpc();
    else if(action==='skill1')this.useSkill(0);
    else if(action==='skill2')this.useSkill(1);
  }

  private showInventory(){
    const lines=this.inventory.map(s=>`${ITEMS[s.itemId]?.name||s.itemId} x${s.quantity}`);
    this.showOverlay(`Inventário — Ouro ${this.gold}\n\n${lines.join('\n')||'Vazio'}\n\nArma: ${this.equipment.weapon?ITEMS[this.equipment.weapon]?.name:'—'}\nArmadura: ${this.equipment.armor?ITEMS[this.equipment.armor]?.name:'—'}`);
  }
  private showQuests(){
    const lines=(this.questData.quests||[]).map((q:any)=>`${q.name||q.questId} [${q.status}]\n${(q.objectives||[]).map((o:any)=>`  ${o.description}: ${o.current}/${o.required}`).join('\n')}`);
    const av=(this.questData.available||[]).map((q:any)=>`Disponível: ${q.name}`);
    this.showOverlay(`Missões\n\n${[...lines,...av].join('\n\n')||'Nenhuma missão'}`);
  }
  private showShop(d:any){
    const lines=(d.items||[]).map((i:any)=>`${i.name} — ${i.price} ouro`);
    this.showOverlay(`${lines.join('\n')}\n\nCompras completas podem ser feitas pelos eventos do cliente.`);
  }

  private showOverlay(text:string){
    this.overlay?.remove();
    const d=document.createElement('div');this.overlay=d;
    d.style.cssText='position:fixed;z-index:250;left:50%;top:50%;transform:translate(-50%,-50%);max-width:520px;width:calc(100% - 32px);max-height:70vh;overflow:auto;background:#0f172af2;color:#e2e8f0;border:1px solid #475569;border-radius:12px;padding:18px;font:13px monospace;white-space:pre-wrap;box-shadow:0 12px 40px #0008;';
    d.textContent=text;
    const b=document.createElement('button');b.textContent='Fechar';
    b.style.cssText='display:block;margin:16px auto 0;padding:8px 16px;background:#334155;color:white;border:0;border-radius:6px;';
    b.onclick=()=>{d.remove();if(this.overlay===d)this.overlay=null;};d.appendChild(b);document.body.appendChild(d);
  }

  private setupChat(){
    const wrap=document.createElement('div');
    wrap.id='chat-ui';wrap.style.cssText='position:fixed;left:10px;bottom:10px;width:min(420px,55vw);z-index:150;font:12px monospace;';
    const log=document.createElement('div');this.chatLog=log;log.id='chat-log';
    log.style.cssText='height:110px;overflow:auto;background:#0008;color:#e2e8f0;padding:6px;border-radius:6px 6px 0 0;pointer-events:auto;';
    const input=document.createElement('input');this.chatInput=input;input.id='chat-input';
    input.placeholder='Enter para chat';input.style.cssText='width:100%;padding:7px;background:#0f172ae8;color:white;border:1px solid #334155;border-radius:0 0 6px 6px;';
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        const raw=input.value.trim();if(!raw)return;
        let channel='local',text=raw,targetName: string|undefined;
        if(raw.startsWith('/g ')){channel='global';text=raw.slice(3);}
        else if(raw.startsWith('/w ')){const parts=raw.slice(3).split(' ');targetName=parts.shift();text=parts.join(' ');channel='private';}
        network.sendChat(channel,text,targetName);input.value='';input.blur();
      }
    });
    wrap.append(log,input);document.body.appendChild(wrap);
  }
  private appendChat(text:string){if(!this.chatLog)return;const div=document.createElement('div');div.textContent=text;this.chatLog.appendChild(div);this.chatLog.scrollTop=this.chatLog.scrollHeight;}
  private flashStatus(text:string){const el=document.getElementById('status');if(!el)return;el.textContent=text;setTimeout(()=>{el.textContent='MMORPG 2D Online';},1800);}

  update(_time:number,delta:number){
    const dt=delta/1000;
    for(const p of this.players.values())p.update(dt);
    for(const m of this.monsters.values())m.update(dt);

    const mobile=this.mobile?.getState?.()||{up:false,down:false,left:false,right:false,attack:false};
    const input:InputPayload={
      up:!!(this.cursors.up.isDown||this.wasd.up.isDown||mobile.up),
      down:!!(this.cursors.down.isDown||this.wasd.down.isDown||mobile.down),
      left:!!(this.cursors.left.isDown||this.wasd.left.isDown||mobile.left),
      right:!!(this.cursors.right.isDown||this.wasd.right.isDown||mobile.right),
      attack:!!(Phaser.Input.Keyboard.JustDown(this.keys.attack)||mobile.attack),
    };
    const changed=input.up!==this.lastInput.up||input.down!==this.lastInput.down||input.left!==this.lastInput.left||input.right!==this.lastInput.right||input.attack;
    if(changed){network.sendInput(input);this.lastInput={...input,attack:false};}
    if(Phaser.Input.Keyboard.JustDown(this.keys.interact))this.interactNpc();
    if(Phaser.Input.Keyboard.JustDown(this.keys.inv))this.showInventory();
    if(Phaser.Input.Keyboard.JustDown(this.keys.quest))this.showQuests();
    if(Phaser.Input.Keyboard.JustDown(this.keys.skill1))this.useSkill(0);
    if(Phaser.Input.Keyboard.JustDown(this.keys.skill2))this.useSkill(1);
  }

  private cleanupHtml(){
    this.mobile?.disable();
    document.getElementById('chat-ui')?.remove();
    this.overlay?.remove();this.overlay=null;
  }
}
