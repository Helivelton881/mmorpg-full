# MMORPG 2D V0.22.1 — produção

Branch de produção web derivada do pacote V0.22 enviado pelo proprietário.

- Frontend: Vite + Phaser, hospedado como Render Static Site
- Backend: Node.js + Socket.IO, hospedado como Render Web Service
- Persistência: PostgreSQL no Supabase

Variáveis do servidor: `DATABASE_URL`, `DB_SSL=true`, `NODE_ENV=production`, `HOST=0.0.0.0`.
Variável do frontend no build: `VITE_SERVER_URL`.
