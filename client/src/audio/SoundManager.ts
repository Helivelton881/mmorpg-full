/** V0.17 — Procedural SFX via Web Audio API (no asset files required) */

type SfxKind = 'hit' | 'hurt' | 'kill' | 'levelup' | 'pickup' | 'ui' | 'skill' | 'death' | 'portal';

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.35;

  private ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try { localStorage.setItem('mmorpg_sfx', on ? '1' : '0'); } catch {}
  }

  isEnabled() {
    return this.enabled;
  }

  loadPrefs() {
    try {
      const v = localStorage.getItem('mmorpg_sfx');
      if (v === '0') this.enabled = false;
    } catch {}
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  play(kind: SfxKind) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.connect(this.ctx.destination);
    g.gain.value = this.volume;

    const beep = (freq: number, dur: number, type: OscillatorType = 'square', delay = 0, vol = 1) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + delay);
      gain.gain.exponentialRampToValueAtTime(this.volume * vol * 0.3, t0 + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t0 + delay);
      osc.stop(t0 + delay + dur + 0.02);
    };

    switch (kind) {
      case 'hit':
        beep(180, 0.08, 'square');
        beep(90, 0.1, 'sawtooth', 0.02, 0.6);
        break;
      case 'hurt':
        beep(120, 0.12, 'sawtooth');
        beep(80, 0.15, 'triangle', 0.05, 0.7);
        break;
      case 'kill':
        beep(220, 0.1, 'square');
        beep(330, 0.12, 'square', 0.08);
        beep(440, 0.15, 'triangle', 0.16);
        break;
      case 'levelup':
        beep(262, 0.12, 'triangle');
        beep(330, 0.12, 'triangle', 0.1);
        beep(392, 0.12, 'triangle', 0.2);
        beep(523, 0.2, 'triangle', 0.3);
        break;
      case 'pickup':
        beep(520, 0.08, 'sine');
        beep(780, 0.1, 'sine', 0.06);
        break;
      case 'ui':
        beep(600, 0.04, 'sine', 0, 0.5);
        break;
      case 'skill':
        beep(300, 0.1, 'sawtooth');
        beep(450, 0.15, 'triangle', 0.08);
        break;
      case 'death':
        beep(200, 0.2, 'sawtooth');
        beep(120, 0.25, 'sawtooth', 0.15);
        beep(60, 0.35, 'triangle', 0.3);
        break;
      case 'portal':
        beep(200, 0.15, 'sine');
        beep(400, 0.2, 'sine', 0.1);
        beep(600, 0.25, 'sine', 0.2);
        break;
    }
  }
}

export const sfx = new SoundManager();
