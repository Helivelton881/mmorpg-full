import Phaser from 'phaser';
import { network } from '../network/NetworkManager';
import { CharacterInfo } from '@mmorpg/shared';

const CLASSES = [
  'guerreiro', 'arqueiro', 'mago', 'clerigo', 'paladino',
  'ladino', 'barbaro', 'monge', 'necromante',
];

export class CharacterSelectScene extends Phaser.Scene {
  private characters: CharacterInfo[] = [];

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  async create() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);

    this.add
      .text(width / 2, 50, 'Selecione seu Personagem', {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#fbbf24',
      })
      .setOrigin(0.5);

    const res = await network.listCharacters();
    if (res.ok) this.characters = res.characters;

    this.renderList();
    this.createHTMLCreateForm();
  }

  private renderList() {
    const old = document.getElementById('char-list');
    if (old) old.remove();

    const list = document.createElement('div');
    list.id = 'char-list';
    list.style.cssText = `
      position: absolute; top: 120px; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; gap: 10px; z-index: 50;
      max-height: 40vh; overflow-y: auto; min-width: 320px;
    `;

    if (this.characters.length === 0) {
      list.innerHTML = `<p style="color:#94a3b8;text-align:center;font-family:monospace;">Nenhum personagem ainda. Crie um abaixo.</p>`;
    } else {
      this.characters.forEach((c) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
        const btn = document.createElement('button');
        btn.style.cssText = `
          flex:1; padding: 14px 20px; border-radius: 8px; border: 1px solid #334155;
          background: #1e293b; color: #e2e8f0; cursor: pointer; text-align: left;
          font-family: monospace; font-size: 14px; display: flex; justify-content: space-between;
        `;
        btn.innerHTML = `
          <span><strong style="color:#4ade80">${c.name}</strong> — ${c.className}</span>
          <span style="color:#94a3b8">Nv.${c.level}</span>
        `;
        btn.onclick = () => this.selectChar(c.id);

        const del = document.createElement('button');
        del.textContent = '✕';
        del.title = 'Deletar personagem';
        del.style.cssText = 'padding:8px 12px;border-radius:8px;border:1px solid #7f1d1d;background:#450a0a;color:#fca5a5;cursor:pointer;font-family:monospace;';
        del.onclick = async (e) => {
          e.stopPropagation();
          if (!confirm(`Deletar permanentemente "${c.name}"?`)) return;
          network.deleteCharacter(c.id);
          const res = await network.listCharacters();
          if (res.ok) {
            this.characters = res.characters;
            this.renderList();
          }
        };
        row.appendChild(btn);
        row.appendChild(del);
        list.appendChild(row);
      });
    }

    document.body.appendChild(list);
  }

  private createHTMLCreateForm() {
    const existing = document.getElementById('create-char-form');
    if (existing) existing.remove();

    const form = document.createElement('div');
    form.id = 'create-char-form';
    form.style.cssText = `
      position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
      background: rgba(15,23,42,0.95); padding: 20px 24px; border-radius: 12px;
      border: 1px solid #334155; display: flex; flex-direction: column; gap: 10px;
      min-width: 320px; z-index: 100; font-family: monospace;
    `;

    const classOptions = CLASSES.map(
      (c, i) => `<option value="${c}" ${i === 0 ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
    ).join('');

    form.innerHTML = `
      <h3 style="color:#e2e8f0;margin:0;text-align:center;font-size:15px;">Criar novo personagem</h3>
      <input id="char-name" type="text" placeholder="Nome do personagem" maxlength="16"
        style="padding:10px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#f1f5f9;font-size:14px;" />
      <select id="char-class"
        style="padding:10px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#f1f5f9;font-size:14px;">
        ${classOptions}
      </select>
      <button id="char-create" style="padding:10px;border-radius:6px;border:none;background:#22c55e;color:white;font-weight:bold;cursor:pointer;font-size:14px;">
        Criar e Jogar
      </button>
      <p id="char-msg" style="color:#f87171;font-size:12px;text-align:center;margin:0;min-height:16px;"></p>
    `;

    document.body.appendChild(form);

    const nameInput = document.getElementById('char-name') as HTMLInputElement;
    const classSelect = document.getElementById('char-class') as HTMLSelectElement;
    const createBtn = document.getElementById('char-create') as HTMLButtonElement;
    const msg = document.getElementById('char-msg') as HTMLParagraphElement;

    createBtn.onclick = async () => {
      const name = nameInput.value.trim();
      const className = classSelect.value;
      if (name.length < 2) {
        msg.textContent = 'Nome muito curto';
        return;
      }

      createBtn.disabled = true;
      createBtn.textContent = 'Criando...';

      const res = await network.createCharacter(name, className);
      if (res.ok && res.character) {
        await this.selectChar(res.character.id);
      } else {
        msg.textContent = res.error || 'Erro ao criar';
        createBtn.disabled = false;
        createBtn.textContent = 'Criar e Jogar';
      }
    };
  }

  private async selectChar(characterId: string) {
    const res = await network.selectCharacter(characterId);
    if (res.ok) {
      this.cleanup();
      this.scene.start('GameScene');
    } else {
      alert(res.error || 'Erro ao selecionar personagem');
    }
  }

  private cleanup() {
    document.getElementById('char-list')?.remove();
    document.getElementById('create-char-form')?.remove();
  }

  shutdown() { this.cleanup(); }
}
