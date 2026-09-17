/** V0.19 — Touch controls for mobile browser */

export interface MobileInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
}

type ActionHandler = (action: string) => void;

export class MobileControls {
  private root: HTMLElement | null;
  private stick: HTMLElement | null;
  private pad: HTMLElement | null;
  private active = false;
  private pointerId: number | null = null;
  private state: MobileInputState = {
    up: false, down: false, left: false, right: false, attack: false,
  };
  private onAction: ActionHandler | null = null;
  private maxRadius = 48;

  constructor() {
    this.root = document.getElementById('mobile-controls');
    this.stick = document.getElementById('mc-stick');
    this.pad = document.getElementById('mc-pad');
  }

  static isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  }

  enable(onAction?: ActionHandler) {
    if (!this.root || !this.pad) return;
    this.onAction = onAction || null;
    this.active = true;
    this.root.classList.add('active');
    this.bindPad();
    this.bindButtons();
  }

  disable() {
    this.active = false;
    this.root?.classList.remove('active');
    this.resetStick();
    this.state = { up: false, down: false, left: false, right: false, attack: false };
  }

  getState(): MobileInputState {
    return { ...this.state };
  }

  private bindPad() {
    if (!this.pad) return;
    const pad = this.pad;

    const onStart = (e: PointerEvent) => {
      if (!this.active) return;
      e.preventDefault();
      e.stopPropagation();
      this.pointerId = e.pointerId;
      try { pad.setPointerCapture(e.pointerId); } catch {}
      this.updateStick(e);
    };
    const onMove = (e: PointerEvent) => {
      if (!this.active || this.pointerId !== e.pointerId) return;
      e.preventDefault();
      this.updateStick(e);
    };
    const onEnd = (e: PointerEvent) => {
      if (this.pointerId !== e.pointerId) return;
      e.preventDefault();
      this.pointerId = null;
      this.resetStick();
    };

    pad.addEventListener('pointerdown', onStart);
    pad.addEventListener('pointermove', onMove);
    pad.addEventListener('pointerup', onEnd);
    pad.addEventListener('pointercancel', onEnd);
  }

  private updateStick(e: PointerEvent) {
    if (!this.pad || !this.stick) return;
    const rect = this.pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const max = this.maxRadius;
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    this.stick.style.transform = `translate(${dx}px, ${dy}px)`;

    const dead = 12;
    const nx = Math.abs(dx) < dead ? 0 : dx;
    const ny = Math.abs(dy) < dead ? 0 : dy;

    this.state.left = nx < -dead;
    this.state.right = nx > dead;
    this.state.up = ny < -dead;
    this.state.down = ny > dead;
  }

  private resetStick() {
    if (this.stick) this.stick.style.transform = 'translate(0, 0)';
    this.state.up = false;
    this.state.down = false;
    this.state.left = false;
    this.state.right = false;
  }

  private bindButtons() {
    const buttons = document.querySelectorAll('.mc-btn');
    buttons.forEach((btn) => {
      const el = btn as HTMLElement;
      const action = el.dataset.action || '';

      const press = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('pressed');
        if (action === 'attack') this.state.attack = true;
        else if (this.onAction) this.onAction(action);
      };
      const release = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('pressed');
        if (action === 'attack') this.state.attack = false;
      };

      el.addEventListener('pointerdown', press);
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', release);
    });
  }
}
