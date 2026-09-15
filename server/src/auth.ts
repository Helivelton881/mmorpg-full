import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUser, createUser } from "./db";
import { CLASSES } from "./data/classes";

// Em produção isso deve vir de uma variável de ambiente (process.env.JWT_SECRET).
// Deixamos um valor padrão só para o protótipo rodar sem configuração extra.
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-troque-isso-em-producao";

export interface TokenPayload {
  username: string;
}

export function register(username: string, password: string, className: string) {
  username = username.trim();
  if (username.length < 3 || username.length > 20) {
    throw new Error("Nome de usuário deve ter entre 3 e 20 caracteres.");
  }
  if (password.length < 6) {
    throw new Error("Senha deve ter ao menos 6 caracteres.");
  }
  if (!CLASSES[className]) {
    throw new Error("Classe inválida.");
  }
  if (getUser(username)) {
    throw new Error("Nome de usuário já existe.");
  }

  const hash = bcrypt.hashSync(password, 10);
  createUser(username, hash, className);
  return issueToken(username);
}

export function login(username: string, password: string) {
  const user = getUser(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new Error("Usuário ou senha inválidos.");
  }
  return issueToken(user.username);
}

function issueToken(username: string) {
  const token = jwt.sign({ username } as TokenPayload, JWT_SECRET, { expiresIn: "7d" });
  const user = getUser(username)!;
  return {
    token,
    character: { username: user.username, class: user.class, level: user.level, xp: user.xp },
  };
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
