import Phaser from 'phaser';
import { network } from '../network/NetworkManager';

export class LoginScene extends Phaser.Scene {
  private messageText!: Phaser.GameObjects.Text;
  private mode: 'login' | 'register' = 'login';

  constructor() {
    super({ key: 'LoginScene' });
  }

  create() {
    network.connect();

    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);

    this.add
      .text(width / 2, 80, 'MMORPG 2D', {
        fontSize: '42px',
        fontFamily: 'monospace',
        color: '#fbbf24',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 130, 'Autenticação', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.createHTMLForm();

    network.onServerInfo((info) => {
      const motd = document.getElementById('server-motd');
      if (motd) motd.textContent = `v${info.version || '?'} — ${info.motd || ''}`;
    });

    this.messageText = this.add
      .text(width / 2, height - 80, '', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#f87171',
      })
      .setOrigin(0.5);
  }

  private createHTMLForm() {
    const existing = document.getElementById('auth-form');
    if (existing) existing.remove();

    const form = document.createElement('div');
    form.id = 'auth-form';
    form.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(15,23,42,0.95); padding: 28px 32px; border-radius: 12px;
      border: 1px solid #334155; display: flex; flex-direction: column; gap: 12px;
      min-width: 300px; z-index: 100; font-family: monospace;
    `;

    form.innerHTML = `
      <h2 style="color:#e2e8f0;margin:0 0 8px;text-align:center;font-size:18px;" id="form-title">Entrar</h2>
      <input id="auth-user" type="text" placeholder="Usuário" maxlength="32"
        style="padding:10px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#f1f5f9;font-size:14px;" />
      <input id="auth-pass" type="password" placeholder="Senha" maxlength="64"
        style="padding:10px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#f1f5f9;font-size:14px;" />
      <button id="auth-submit" style="padding:10px;border-radius:6px;border:none;background:#3b82f6;color:white;font-weight:bold;cursor:pointer;font-size:14px;">
        Entrar
      </button>
      <button id="auth-toggle" style="padding:8px;border-radius:6px;border:1px solid #475569;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;">
        Não tem conta? Cadastre-se
      </button>
      <p id="auth-msg" style="color:#f87171;font-size:12px;text-align:center;margin:0;min-height:16px;"></p>
    `;

    const motd = document.createElement('p');
    motd.id = 'server-motd';
    motd.style.cssText = 'position:absolute;bottom:24px;left:50%;transform:translateX(-50%);color:#64748b;font-family:monospace;font-size:12px;text-align:center;max-width:90%;z-index:40;';
    motd.textContent = 'Conectando...';
    document.body.appendChild(motd);
    document.body.appendChild(form);

    const userInput = document.getElementById('auth-user') as HTMLInputElement;
    const passInput = document.getElementById('auth-pass') as HTMLInputElement;
    const submitBtn = document.getElementById('auth-submit') as HTMLButtonElement;
    const toggleBtn = document.getElementById('auth-toggle') as HTMLButtonElement;
    const msg = document.getElementById('auth-msg') as HTMLParagraphElement;
    const title = document.getElementById('form-title') as HTMLHeadingElement;

    const saved = localStorage.getItem('mmorpg_username');
    if (saved) userInput.value = saved;

    toggleBtn.onclick = () => {
      this.mode = this.mode === 'login' ? 'register' : 'login';
      title.textContent = this.mode === 'login' ? 'Entrar' : 'Cadastrar';
      submitBtn.textContent = this.mode === 'login' ? 'Entrar' : 'Criar conta';
      toggleBtn.textContent =
        this.mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar';
      msg.textContent = '';
    };

    const doAuth = async () => {
      const username = userInput.value.trim();
      const password = passInput.value;
      if (!username || !password) {
        msg.textContent = 'Preencha usuário e senha';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Aguarde...';
      msg.textContent = '';

      try {
        if (this.mode === 'register') {
          const res = await network.register(username, password);
          if (res.ok) {
            msg.style.color = '#4ade80';
            msg.textContent = 'Conta criada! Faça login.';
            this.mode = 'login';
            title.textContent = 'Entrar';
            submitBtn.textContent = 'Entrar';
            toggleBtn.textContent = 'Não tem conta? Cadastre-se';
          } else {
            msg.style.color = '#f87171';
            msg.textContent = res.error || 'Erro no cadastro';
          }
        } else {
          const res = await network.login(username, password);
          if (res.ok) {
            localStorage.setItem('mmorpg_username', username);
            form.remove();
            this.scene.start('CharacterSelectScene');
          } else {
            msg.style.color = '#f87171';
            msg.textContent = res.error || 'Erro no login';
          }
        }
      } catch {
        msg.style.color = '#f87171';
        msg.textContent = 'Erro de conexão';
      }

      submitBtn.disabled = false;
      submitBtn.textContent = this.mode === 'login' ? 'Entrar' : 'Criar conta';
    };

    submitBtn.onclick = doAuth;
    passInput.onkeydown = (e) => {
      if (e.key === 'Enter') void doAuth();
    };
  }

  shutdown() {
    document.getElementById('auth-form')?.remove();
    document.getElementById('server-motd')?.remove();
  }
}
