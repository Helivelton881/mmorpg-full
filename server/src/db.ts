import Database from "better-sqlite3";
import path from "path";

// SQLite grava tudo em um único arquivo (mmorpg.db). Não precisa instalar
// servidor de banco nenhum — funciona direto, de graça. Quando o jogo
// crescer e precisar de mais robustez/concorrência, trocar para PostgreSQL
// é só trocar este arquivo (a interface abaixo continua igual).
const db = new Database(path.join(__dirname, "../../mmorpg.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    class TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

export interface UserRow {
  username: string;
  password_hash: string;
  class: string;
  level: number;
  xp: number;
}

export function getUser(username: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
}

export function createUser(username: string, passwordHash: string, className: string): void {
  db.prepare(
    "INSERT INTO users (username, password_hash, class, level, xp, created_at) VALUES (?, ?, ?, 1, 0, ?)"
  ).run(username, passwordHash, className, Date.now());
}

export function updateProgress(username: string, level: number, xp: number): void {
  db.prepare("UPDATE users SET level = ?, xp = ? WHERE username = ?").run(level, xp, username);
}

export default db;
