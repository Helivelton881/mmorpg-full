export interface TradeOffer {
  items: Array<{ itemId: string; quantity: number }>;
  gold: number;
  confirmed: boolean;
}

export interface TradeSession {
  a: string;
  b: string;
  offerA: TradeOffer;
  offerB: TradeOffer;
}

export class TradeManager {
  pending = new Map<string, string>();
  sessions = new Map<string, TradeSession>();

  request(fromId: string, targetId: string): { ok: boolean; error?: string } {
    if (fromId === targetId) return { ok: false, error: 'Inválido' };
    if (this.sessions.has(fromId) || this.sessions.has(targetId)) {
      return { ok: false, error: 'Já em troca' };
    }
    this.pending.set(targetId, fromId);
    return { ok: true };
  }

  accept(targetId: string): { ok: boolean; error?: string; session?: TradeSession } {
    const fromId = this.pending.get(targetId);
    if (!fromId) return { ok: false, error: 'Nenhum pedido de troca' };
    this.pending.delete(targetId);
    const session: TradeSession = {
      a: fromId,
      b: targetId,
      offerA: { items: [], gold: 0, confirmed: false },
      offerB: { items: [], gold: 0, confirmed: false },
    };
    this.sessions.set(fromId, session);
    this.sessions.set(targetId, session);
    return { ok: true, session };
  }

  decline(targetId: string) {
    this.pending.delete(targetId);
  }

  getSession(socketId: string): TradeSession | null {
    return this.sessions.get(socketId) || null;
  }

  getOffer(session: TradeSession, socketId: string): TradeOffer {
    return session.a === socketId ? session.offerA : session.offerB;
  }

  setItem(socketId: string, itemId: string, quantity: number): { ok: boolean; error?: string } {
    const s = this.sessions.get(socketId);
    if (!s) return { ok: false, error: 'Sem troca ativa' };
    const offer = this.getOffer(s, socketId);
    offer.confirmed = false;
    const other = s.a === socketId ? s.offerB : s.offerA;
    other.confirmed = false;
    offer.items = offer.items.filter((i) => i.itemId !== itemId);
    if (quantity > 0) offer.items.push({ itemId, quantity });
    return { ok: true };
  }

  setGold(socketId: string, gold: number): { ok: boolean; error?: string } {
    const s = this.sessions.get(socketId);
    if (!s) return { ok: false, error: 'Sem troca ativa' };
    const offer = this.getOffer(s, socketId);
    offer.confirmed = false;
    const other = s.a === socketId ? s.offerB : s.offerA;
    other.confirmed = false;
    offer.gold = Math.max(0, Math.floor(gold));
    return { ok: true };
  }

  confirm(socketId: string): { ok: boolean; error?: string; bothConfirmed?: boolean } {
    const s = this.sessions.get(socketId);
    if (!s) return { ok: false, error: 'Sem troca ativa' };
    this.getOffer(s, socketId).confirmed = true;
    return { ok: true, bothConfirmed: s.offerA.confirmed && s.offerB.confirmed };
  }

  cancel(socketId: string) {
    const s = this.sessions.get(socketId);
    if (!s) return;
    this.sessions.delete(s.a);
    this.sessions.delete(s.b);
  }
}
