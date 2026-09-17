/**
 * Database layer - V0.3
 * Primary: PostgreSQL
 * Fallback (dev): in-memory store so the game can run without a real DB
 */
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface UserRow {
  id:string; username:string; password_hash:string; created_at:Date; last_login:Date|null;
}
export interface CharacterRow {
  id:string; user_id:string; name:string; class_name:string; level:number; experience:number;
  pos_x:number; pos_y:number; map_id:string; gold:number; inventory_json:string; equipment_json:string;
  quests_json:string; created_at:Date; updated_at:Date;
}

class MemoryStore {
  users = new Map<string, UserRow>();
  characters = new Map<string, CharacterRow>();
  sessions = new Map<string, { userId:string; expiresAt:number }>();
  usernameIndex = new Map<string,string>();
  charNameIndex = new Map<string,string>();
  constructor() { console.log('[DB] Using in-memory store (development mode)'); }
}

export class Database {
  private pool: Pool | null = null;
  private memory: MemoryStore | null = null;
  private useMemory = false;

  async connect() {
    const connectionString = process.env.DATABASE_URL || '';
    if (!connectionString) {
      console.warn('[DB] DATABASE_URL not set → in-memory store (data lost on restart)');
      this.memory = new MemoryStore();
      this.useMemory = true;
      return;
    }
    try {
      const needsSsl =
        /neon\.tech|supabase\.co|render\.com|sslmode=require/i.test(connectionString) ||
        process.env.DB_SSL === 'true';
      this.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 8000,
        ssl: needsSsl ? { rejectUnauthorized:false } : undefined,
        max:5,
      });
      await this.pool.query('SELECT 1');
      await this.ensureSchema();
      console.log('[DB] Connected to PostgreSQL (persistent)');
      this.useMemory = false;
    } catch (err:any) {
      console.warn('[DB] PostgreSQL unavailable → in-memory store');
      console.warn('[DB] Reason:', err?.message || err);
      this.pool = null;
      this.memory = new MemoryStore();
      this.useMemory = true;
    }
  }

  isMemoryMode() { return this.useMemory; }

  private async ensureSchema() {
    if (!this.pool) return;
    await this.pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(32) UNIQUE NOT NULL,
        password_hash VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS characters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(16) UNIQUE NOT NULL,
        class_name VARCHAR(32) NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        experience INTEGER NOT NULL DEFAULT 0,
        pos_x DOUBLE PRECISION NOT NULL DEFAULT 400,
        pos_y DOUBLE PRECISION NOT NULL DEFAULT 400,
        map_id VARCHAR(64) NOT NULL DEFAULT 'starter',
        gold INTEGER NOT NULL DEFAULT 50,
        inventory_json TEXT NOT NULL DEFAULT '[{"itemId":"potion_hp","quantity":3},{"itemId":"potion_mp","quantity":2}]',
        equipment_json TEXT NOT NULL DEFAULT '{"weapon":null,"armor":null}',
        quests_json TEXT NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(64) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
      CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);
    await this.pool.query(`
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS gold INTEGER NOT NULL DEFAULT 50;
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS inventory_json TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS equipment_json TEXT NOT NULL DEFAULT '{"weapon":null,"armor":null}';
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS quests_json TEXT NOT NULL DEFAULT '[]';
    `).catch(() => {});
    console.log('[DB] Schema ready');
  }

  async disconnect() { if (this.pool) await this.pool.end(); }

  async register(username:string, password:string): Promise<{ok:boolean;error?:string;userId?:string}> {
    const clean = username.trim().toLowerCase();
    if (clean.length < 3 || clean.length > 32) return { ok:false, error:'Usuário deve ter entre 3 e 32 caracteres' };
    if (password.length < 4) return { ok:false, error:'Senha deve ter pelo menos 4 caracteres' };
    const hash = await bcrypt.hash(password, 10);

    if (this.useMemory && this.memory) {
      if (this.memory.usernameIndex.has(clean)) return { ok:false, error:'Usuário já existe' };
      const id = randomBytes(16).toString('hex');
      const user:UserRow = { id, username:clean, password_hash:hash, created_at:new Date(), last_login:null };
      this.memory.users.set(id,user);
      this.memory.usernameIndex.set(clean,id);
      return { ok:true, userId:id };
    }
    try {
      const res = await this.pool!.query(
        `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id`, [clean,hash]
      );
      return { ok:true, userId:res.rows[0].id };
    } catch (e:any) {
      if (e.code === '23505') return { ok:false, error:'Usuário já existe' };
      console.error('[DB] register error', e);
      return { ok:false, error:'Erro interno' };
    }
  }

  async login(username:string, password:string): Promise<{ok:boolean;error?:string;userId?:string;token?:string}> {
    const clean = username.trim().toLowerCase();
    let user:UserRow|null = null;
    if (this.useMemory && this.memory) {
      const id = this.memory.usernameIndex.get(clean);
      if (id) user = this.memory.users.get(id) || null;
    } else {
      const res = await this.pool!.query(`SELECT * FROM users WHERE username = $1`, [clean]);
      user = res.rows[0] || null;
    }
    if (!user) return { ok:false, error:'Usuário ou senha inválidos' };
    if (!(await bcrypt.compare(password,user.password_hash))) return { ok:false, error:'Usuário ou senha inválidos' };

    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7*24*60*60*1000;
    if (this.useMemory && this.memory) {
      this.memory.sessions.set(token,{userId:user.id,expiresAt});
      user.last_login = new Date();
    } else {
      await this.pool!.query(
        `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1,$2,to_timestamp($3 / 1000.0))`,
        [token,user.id,expiresAt]
      );
      await this.pool!.query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);
    }
    return { ok:true, userId:user.id, token };
  }

  async validateToken(token:string): Promise<string|null> {
    if (!token) return null;
    if (this.useMemory && this.memory) {
      const s = this.memory.sessions.get(token);
      if (!s || s.expiresAt < Date.now()) {
        this.memory.sessions.delete(token);
        return null;
      }
      return s.userId;
    }
    const res = await this.pool!.query(
      `SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()`, [token]
    );
    return res.rows[0]?.user_id || null;
  }

  async getCharacters(userId:string): Promise<CharacterRow[]> {
    if (this.useMemory && this.memory) {
      return Array.from(this.memory.characters.values()).filter(c => c.user_id === userId);
    }
    const res = await this.pool!.query(`SELECT * FROM characters WHERE user_id = $1 ORDER BY created_at`, [userId]);
    return res.rows;
  }

  async createCharacter(userId:string, name:string, className:string):
    Promise<{ok:boolean;error?:string;character?:CharacterRow}> {
    const cleanName = name.trim().slice(0,16);
    if (cleanName.length < 2) return { ok:false, error:'Nome muito curto' };
    const validClasses = ['guerreiro','arqueiro','mago','clerigo','paladino','ladino','barbaro','monge','necromante'];
    const cls = validClasses.includes(className) ? className : 'guerreiro';

    const defaultInv = JSON.stringify([
      { itemId:'potion_hp', quantity:3 },
      { itemId:'potion_mp', quantity:2 },
    ]);
    const defaultEq = JSON.stringify({weapon:null,armor:null});

    if (this.useMemory && this.memory) {
      if (this.memory.charNameIndex.has(cleanName.toLowerCase())) return {ok:false,error:'Nome de personagem já existe'};
      const existing = Array.from(this.memory.characters.values()).filter(c=>c.user_id===userId);
      if (existing.length>=3) return {ok:false,error:'Máximo de 3 personagens'};
      const id = randomBytes(16).toString('hex');
      const char:CharacterRow = {
        id,user_id:userId,name:cleanName,class_name:cls,level:1,experience:0,
        pos_x:500+Math.random()*100,pos_y:400+Math.random()*100,map_id:'starter',gold:50,
        inventory_json:defaultInv,equipment_json:defaultEq,quests_json:'[]',
        created_at:new Date(),updated_at:new Date(),
      };
      this.memory.characters.set(id,char);
      this.memory.charNameIndex.set(cleanName.toLowerCase(),id);
      return {ok:true,character:char};
    }

    try {
      const countRes = await this.pool!.query(
        `SELECT COUNT(*)::int AS cnt FROM characters WHERE user_id = $1`, [userId]
      );
      if (countRes.rows[0].cnt >= 3) return {ok:false,error:'Máximo de 3 personagens'};
      const res = await this.pool!.query(
        `INSERT INTO characters (user_id,name,class_name,pos_x,pos_y,gold,inventory_json,equipment_json,quests_json)
         VALUES ($1,$2,$3,$4,$5,50,$6,$7,'[]') RETURNING *`,
        [userId,cleanName,cls,500+Math.random()*100,400+Math.random()*100,defaultInv,defaultEq]
      );
      return {ok:true,character:res.rows[0]};
    } catch (e:any) {
      if (e.code==='23505') return {ok:false,error:'Nome de personagem já existe'};
      console.error('[DB] createCharacter error',e);
      return {ok:false,error:'Erro interno'};
    }
  }

  async getCharacter(charId:string,userId:string):Promise<CharacterRow|null> {
    if (this.useMemory && this.memory) {
      const c=this.memory.characters.get(charId);
      return c && c.user_id===userId ? c : null;
    }
    const res=await this.pool!.query(`SELECT * FROM characters WHERE id=$1 AND user_id=$2`,[charId,userId]);
    return res.rows[0] || null;
  }

  async deleteCharacter(charId:string,userId:string):Promise<{ok:boolean;error?:string}> {
    if (this.useMemory && this.memory) {
      const c=this.memory.characters.get(charId);
      if (!c || c.user_id!==userId) return {ok:false,error:'Personagem não encontrado'};
      this.memory.charNameIndex.delete(c.name.toLowerCase());
      this.memory.characters.delete(charId);
      return {ok:true};
    }
    try {
      const res=await this.pool!.query(
        `DELETE FROM characters WHERE id=$1 AND user_id=$2 RETURNING id`,[charId,userId]
      );
      if (!res.rowCount) return {ok:false,error:'Personagem não encontrado'};
      return {ok:true};
    } catch(e) {
      console.error('[DB] deleteCharacter',e);
      return {ok:false,error:'Erro ao deletar'};
    }
  }

  async savePosition(charId:string,x:number,y:number,mapId='starter') {
    return this.saveProgress(charId,{x,y,mapId});
  }

  async saveProgress(charId:string,data:{
    x?:number;y?:number;mapId?:string;level?:number;experience?:number;gold?:number;
    inventory?:Array<{itemId:string;quantity:number}>;
    equipment?:{weapon:string|null;armor:string|null};quests?:any[];
  }) {
    if (this.useMemory && this.memory) {
      const c=this.memory.characters.get(charId);
      if(c) {
        if(data.x!=null)c.pos_x=data.x; if(data.y!=null)c.pos_y=data.y;
        if(data.mapId!=null)c.map_id=data.mapId; if(data.level!=null)c.level=data.level;
        if(data.experience!=null)c.experience=data.experience; if(data.gold!=null)c.gold=data.gold;
        if(data.inventory!=null)c.inventory_json=JSON.stringify(data.inventory);
        if(data.equipment!=null)c.equipment_json=JSON.stringify(data.equipment);
        if(data.quests!=null)c.quests_json=JSON.stringify(data.quests);
        c.updated_at=new Date();
      }
      return;
    }
    const sets:string[]=[]; const vals:any[]=[]; let i=1;
    if(data.x!=null){sets.push(`pos_x = $${i++}`);vals.push(data.x);}
    if(data.y!=null){sets.push(`pos_y = $${i++}`);vals.push(data.y);}
    if(data.mapId!=null){sets.push(`map_id = $${i++}`);vals.push(data.mapId);}
    if(data.level!=null){sets.push(`level = $${i++}`);vals.push(data.level);}
    if(data.experience!=null){sets.push(`experience = $${i++}`);vals.push(data.experience);}
    if(data.gold!=null){sets.push(`gold = $${i++}`);vals.push(data.gold);}
    if(data.inventory!=null){sets.push(`inventory_json = $${i++}`);vals.push(JSON.stringify(data.inventory));}
    if(data.equipment!=null){sets.push(`equipment_json = $${i++}`);vals.push(JSON.stringify(data.equipment));}
    if(data.quests!=null){sets.push(`quests_json = $${i++}`);vals.push(JSON.stringify(data.quests));}
    if(sets.length===0)return;
    sets.push('updated_at = NOW()');
    vals.push(charId);
    await this.pool!.query(`UPDATE characters SET ${sets.join(', ')} WHERE id = $${i}`,vals);
  }
}
export const db = new Database();
