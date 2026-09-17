# MMORPG 2D V0.22.1 — produção

Branch de produção web derivada do pacote V0.22, mantida separada da `main` antiga.

## Produção

- Jogo web: https://mmorpg-2d-v022-web.onrender.com
- Servidor Socket.IO/API: https://mmorpg-2d-v022-server.onrender.com
- Supabase project: `depdbddsbszhyeiuxhtd` — São Paulo (`sa-east-1`)
- Edge Function privada: `game-db-gateway`

## Arquitetura

- Frontend: Vite + Phaser em Render Static Site
- Backend: Node.js + TypeScript + Socket.IO em Render Web Service
- Persistência: Supabase PostgreSQL
- Acesso ao banco: Render -> Edge Function privada -> Supabase, sem credencial privilegiada no navegador ou no GitHub
- RLS habilitado nas tabelas expostas; acesso público direto bloqueado

## Variáveis de produção

Servidor:
- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `DB_GATEWAY_URL`
- `DB_GATEWAY_SECRET` (segredo somente no Render)
- `DB_SSL=true`

Frontend:
- `VITE_SERVER_URL=https://mmorpg-2d-v022-server.onrender.com`

O segredo do gateway não deve ser commitado no GitHub nem enviado ao cliente.
