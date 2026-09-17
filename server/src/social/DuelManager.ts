export interface Duel {
  a: string;
  b: string;
  active: boolean;
}

export class DuelManager {
  pending = new Map<string, string>();
  active = new Map<string, Duel>();

  request(fromId: string, targetId: string, fromMap: string): { ok: boolean; error?: string } {
    if (fromMap === 'starter') return { ok: false, error: 'Zona segura — duelos só no Campo ou Floresta' };
    if (fromId === targetId) return { ok: false, error: 'Não pode desafiar a si mesmo' };
    if (this.active.has(fromId) || this.active.has(targetId)) {
      return { ok: false, error: 'Um dos jogadores já está em duelo' };
    }
    this.pending.set(targetId, fromId);
    return { ok: true };
  }

  accept(targetId: string): { ok: boolean; error?: string; duel?: Duel } {
    const challenger = this.pending.get(targetId);
    if (!challenger) return { ok: false, error: 'Nenhum desafio pendente' };
    this.pending.delete(targetId);
    const duel: Duel = { a: challenger, b: targetId, active: true };
    this.active.set(challenger, duel);
    this.active.set(targetId, duel);
    return { ok: true, duel };
  }

  decline(targetId: string) {
    this.pending.delete(targetId);
  }

  getOpponent(socketId: string): string | null {
    const d = this.active.get(socketId);
    if (!d) return null;
    return d.a === socketId ? d.b : d.a;
  }

  isInDuel(socketId: string): boolean {
    return this.active.has(socketId);
  }

  end(socketId: string) {
    const d = this.active.get(socketId);
    if (!d) return;
    this.active.delete(d.a);
    this.active.delete(d.b);
  }

  canAttackPlayer(attackerId: string, targetId: string, attackerMap: string): boolean {
    if (attackerMap === 'starter') return false;
    const d = this.active.get(attackerId);
    if (!d || !d.active) return false;
    return (d.a === attackerId && d.b === targetId) || (d.b === attackerId && d.a === targetId);
  }
}
