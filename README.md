# Reino de Claudonia — MMORPG no navegador

Um MMORPG completo e jogável: contas persistentes, 9 classes, combate em
tempo real, inimigos com IA, sistema de XP/nível e chat. Tudo rodando no
Chrome via WebSocket, construído do zero com mecânicas originais (inspirado
no *estilo* de MMOs clássicos, sem copiar código ou conteúdo de nenhum jogo).

## Ferramentas usadas (todas gratuitas)

| Camada           | Ferramenta                                    |
|------------------|-------------------------------------------------|
| Cliente          | Phaser 3 + Vite                                 |
| Rede em tempo real | Colyseus (WebSocket)                          |
| Servidor         | Node.js + TypeScript + Express                  |
| Autenticação     | JWT + bcryptjs                                  |
| Banco de dados   | SQLite (`better-sqlite3`) — um arquivo local, sem instalar nada |

Nenhuma dessas ferramentas exige licença paga ou cartão de crédito.

## O que está implementado

- **Contas persistentes**: registro e login com senha criptografada (bcrypt)
  e sessão via JWT. Nível e XP são salvos no banco quando o jogador sai.
- **9 classes** (Guerreiro, Paladino, Caçador, Ladino, Sacerdote, Xamã, Mago,
  Bruxo, Druida), cada uma com HP/mana base diferentes, alcance de ataque
  próprio e uma habilidade especial única (dano ou cura).
- **Mundo compartilhado**: todos os jogadores conectados veem uns aos
  outros em tempo real na mesma zona (`world_zone_1`).
- **Combate com autoridade no servidor**: cliente só pede "atacar alvo X";
  o servidor calcula dano (com variação aleatória), aplica cooldowns,
  valida alcance e mana. Cliente nunca decide resultado de combate sozinho.
- **Inimigos com IA simples**: vagueiam perto do ponto de spawn, perseguem e
  atacam jogadores que chegam perto, dão XP ao morrer e reaparecem depois
  de um tempo.
- **Progressão**: XP, level up (aumenta HP/mana máximos), curva de XP
  exponencial simples.
- **HUD**: barras de HP/mana/XP, seleção de alvo por clique, chat.

## O que fica como próximo passo (não implementado, de propósito, pra não
inflar demais o protótipo)

- Múltiplos personagens por conta / troca de zona (o `GameRoom.ts` já está
  estruturado para você duplicar como `world_zone_2`, `dungeon_1`, etc.)
- Inventário, itens, loot dropado por inimigos
- Grupos/guildas, PvP com regras (hoje dá pra atacar outro jogador clicando
  nele, mas não há times/flags de PvP)
- Sprites de verdade (hoje são círculos coloridos — funcional, mas sem arte)

## Como rodar localmente

Pré-requisito único: **Node.js 18+** (gratuito, https://nodejs.org).

Abra dois terminais.

**Terminal 1 — servidor**
```bash
cd server
npm install
npm run dev
```
Na primeira vez, isso cria automaticamente o arquivo `mmorpg.db` (SQLite) na
pasta `server`. O servidor sobe em `http://localhost:2567` (REST + WebSocket).

**Terminal 2 — cliente**
```bash
cd client
npm install
npm run dev
```
O Vite mostra um endereço tipo `http://localhost:5173` — abra no Chrome.

Crie uma conta, escolha uma classe, e você entra no mundo. Abra a mesma URL
em outra aba (ou peça pra um amigo na mesma rede acessar seu IP local) para
ver dois jogadores no mesmo mapa, combate incluso.

## Controles

- **Setas / WASD**: mover
- **Clique num inimigo ou jogador**: selecionar como alvo
- **1**: ataque básico (sem custo, cooldown curto)
- **2**: habilidade especial da sua classe (custa mana, cooldown maior)
- **Enter** (com o campo de chat focado): enviar mensagem

## Próximos passos sugeridos, em ordem de impacto

1. **Sprites reais**: trocar os círculos por spritesheets. Aseprite
   (gratuito) para pixel art, ou baixar assets livres do itch.io/OpenGameArt.
2. **Mais de uma zona**: duplicar a lógica de `GameRoom` para uma
   `DungeonRoom`, e usar `client.leave()` + `client.joinOrCreate()` para
   migrar o jogador entre elas.
3. **Inventário e itens**: adicionar tabela `items` no SQLite e um
   `MapSchema<ItemState>` no `PlayerState`.
4. **Deploy gratuito**: Render.com ou Railway.app (planos free) para o
   servidor Node; Vercel/Netlify (grátis) para o cliente compilado
   (`npm run build` gera a pasta `dist`, é só apontar o host pra ela).
5. Se o jogo crescer muito, trocar SQLite por PostgreSQL é uma migração
   pequena — a interface em `db.ts` já isola essa parte do resto do código.
