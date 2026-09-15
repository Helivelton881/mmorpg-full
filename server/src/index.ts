import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";
import { register, login } from "./auth";
import { CLASSES } from "./data/classes";

const port = Number(process.env.PORT) || 2567;
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/classes", (_req, res) => {
  const list = Object.values(CLASSES).map((c) => ({ key: c.key, label: c.label, color: c.color }));
  res.json(list);
});

app.post("/api/register", (req, res) => {
  try {
    const { username, password, className } = req.body || {};
    const result = register(username, password, className);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = login(username, password);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });
gameServer.define("world_zone_1", GameRoom);

gameServer.listen(port);
console.log(`Servidor rodando em http://localhost:${port} (REST + WebSocket)`);
