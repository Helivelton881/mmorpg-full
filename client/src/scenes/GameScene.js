import Phaser from "phaser";
import { Client } from "colyseus.js";

const SERVER_WS_URL = "ws://localhost:2567";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.entitySprites = new Map(); // id -> { sprite, label, hpBarBg, hpBarFill, ring }
    this.room = null;
    this.cursors = null;
    this.keys = null;
    this.selfId = null;
  }

  async create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,ONE,TWO");

    const token = this.game.registry.get("token");

    // HUD (fixo na tela, não se move com o mundo)
    this.hud = this.add.container(0, 0).setDepth(1000).setScrollFactor(0);
    this.hpBarBg = this.add.rectangle(110, 20, 200, 16, 0x220000).setOrigin(0, 0.5);
    this.hpBarFill = this.add.rectangle(112, 20, 196, 12, 0xd33a3a).setOrigin(0, 0.5);
    this.manaBarBg = this.add.rectangle(110, 40, 200, 12, 0x001d33).setOrigin(0, 0.5);
    this.manaBarFill = this.add.rectangle(112, 40, 196, 8, 0x3a9bd3).setOrigin(0, 0.5);
    this.xpBarBg = this.add.rectangle(110, 56, 200, 8, 0x1a1a1a).setOrigin(0, 0.5);
    this.xpBarFill = this.add.rectangle(111, 56, 198, 5, 0xd8b76a).setOrigin(0, 0.5);
    this.hudText = this.add.text(10, 10, "", { fontSize: "12px", color: "#eae6f2" });
    this.abilityText = this.add.text(10, 66, "", { fontSize: "11px", color: "#9d97b3" });
    this.hud.add([
      this.hpBarBg, this.hpBarFill, this.manaBarBg, this.manaBarFill,
      this.xpBarBg, this.xpBarFill, this.hudText, this.abilityText,
    ]);

    const client = new Client(SERVER_WS_URL);
    try {
      this.room = await client.joinOrCreate("world_zone_1", { token });
    } catch (err) {
      this.add.text(20, 20, "Falha ao conectar. Verifique se o servidor está rodando.\n(" + err.message + ")", {
        color: "#ff6666", fontSize: "14px", wordWrap: { width: 760 },
      });
      return;
    }

    this.selfId = this.room.sessionId;

    this.room.state.players.onAdd((player, sessionId) => {
      this.createEntitySprite(sessionId, player, "player");
      player.onChange(() => this.syncEntitySprite(sessionId, player));
    });
    this.room.state.players.onRemove((_p, sessionId) => this.destroyEntitySprite(sessionId));

    this.room.state.enemies.onAdd((enemy, enemyId) => {
      this.createEntitySprite(enemyId, enemy, "enemy");
      enemy.onChange(() => this.syncEntitySprite(enemyId, enemy));
    });

    this.room.onMessage("chat", (data) => this.pushChatLine(`${data.name}: ${data.message}`));
    this.room.onMessage("levelUp", (data) => this.pushChatLine(`✦ ${data.username} alcançou o nível ${data.level}!`, "#d8b76a"));

    this.setupChatInput();
  }

  createEntitySprite(id, entity, kind) {
    const isSelf = kind === "player" && id === this.selfId;
    const radius = kind === "enemy" ? 12 : 16;
    const color = kind === "enemy" ? entity.color : entity.color;

    const sprite = this.add.circle(entity.x, entity.y, radius, color)
      .setStrokeStyle(isSelf ? 3 : 1, isSelf ? 0xffffff : 0x000000)
      .setInteractive({ useHandCursor: true });

    sprite.on("pointerdown", () => {
      if (kind === "enemy" || (kind === "player" && id !== this.selfId)) {
        this.room.send("setTarget", { targetId: id });
      }
    });

    const labelText = kind === "enemy" ? `${entity.name} Lv${entity.level}` : entity.username;
    const label = this.add.text(entity.x - 24, entity.y - 30, labelText, { fontSize: "11px", color: "#ffffff" });

    const hpBarBg = this.add.rectangle(entity.x, entity.y - 22, 30, 4, 0x330000).setOrigin(0.5);
    const hpBarFill = this.add.rectangle(entity.x - 15, entity.y - 22, 30, 4, 0xd33a3a).setOrigin(0, 0.5);

    this.entitySprites.set(id, { sprite, label, hpBarBg, hpBarFill, kind });
  }

  syncEntitySprite(id, entity) {
    const e = this.entitySprites.get(id);
    if (!e) return;
    e.sprite.setPosition(entity.x, entity.y);
    e.sprite.setVisible(entity.alive !== false);
    e.label.setPosition(entity.x - 24, entity.y - 30);
    e.label.setVisible(entity.alive !== false);
    e.hpBarBg.setPosition(entity.x, entity.y - 22).setVisible(entity.alive !== false);
    const pct = Math.max(0, entity.hp / entity.maxHp);
    e.hpBarFill.setPosition(entity.x - 15, entity.y - 22).setSize(30 * pct, 4).setVisible(entity.alive !== false);

    if (id === this.selfId) this.updateHud(entity);
  }

  destroyEntitySprite(id) {
    const e = this.entitySprites.get(id);
    if (!e) return;
    e.sprite.destroy(); e.label.destroy(); e.hpBarBg.destroy(); e.hpBarFill.destroy();
    this.entitySprites.delete(id);
  }

  updateHud(player) {
    this.hpBarFill.width = 196 * Math.max(0, player.hp / player.maxHp);
    this.manaBarFill.width = 196 * Math.max(0, player.mana / player.maxMana);
    this.xpBarFill.width = 198 * Math.max(0, player.xp / player.xpToNext);
    this.hudText.setText(`${player.username}  Lv${player.level}  HP ${player.hp}/${player.maxHp}  Mana ${player.mana}/${player.maxMana}`);
    this.abilityText.setText(`[1] Ataque básico   [2] Habilidade especial   ${player.alive ? "" : "— você morreu, respawn em breve —"}`);
  }

  pushChatLine(text, color = "#eae6f2") {
    const log = document.getElementById("chat-log");
    const div = document.createElement("div");
    div.textContent = text;
    div.style.color = color;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    while (log.children.length > 50) log.removeChild(log.firstChild);
  }

  setupChatInput() {
    const input = document.getElementById("chat-input");
    input.addEventListener("keydown", (e) => {
      e.stopPropagation(); // não deixa "W/A/S/D" digitados no chat mexerem o personagem
      if (e.key === "Enter" && input.value.trim()) {
        this.room.send("chat", input.value.trim());
        input.value = "";
        input.blur();
      }
    });
  }

  update() {
    if (!this.room) return;

    // se o foco estiver no campo de chat, não processa movimento/atalhos do jogo
    if (document.activeElement === document.getElementById("chat-input")) return;

    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) dy = 1;
    if (dx !== 0 || dy !== 0) this.room.send("move", { dx, dy });

    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.room.send("attack");
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.room.send("ability");
  }
}
