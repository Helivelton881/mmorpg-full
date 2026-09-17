import { Player } from '../entities/Player';

export interface Party {
  id: string;
  leaderId: string;
  members: Set<string>;
}

let nextPartyId = 1;

export class PartyManager {
  parties = new Map<string, Party>();
  playerParty = new Map<string, string>();
  pendingInvites = new Map<string, string>();

  create(leaderId: string): Party {
    this.leave(leaderId);
    const id = `party_${nextPartyId++}`;
    const party: Party = { id, leaderId, members: new Set([leaderId]) };
    this.parties.set(id, party);
    this.playerParty.set(leaderId, id);
    return party;
  }

  invite(fromId: string, targetId: string): { ok: boolean; error?: string } {
    if (!this.playerParty.get(fromId)) this.create(fromId);
    const pid = this.playerParty.get(fromId)!;
    const party = this.parties.get(pid)!;
    if (party.leaderId !== fromId) return { ok: false, error: 'Só o líder pode convidar' };
    if (party.members.size >= 5) return { ok: false, error: 'Party cheia (máx 5)' };
    if (this.playerParty.has(targetId)) return { ok: false, error: 'Jogador já está em uma party' };
    this.pendingInvites.set(targetId, fromId);
    return { ok: true };
  }

  accept(targetId: string): { ok: boolean; error?: string; party?: Party } {
    const fromId = this.pendingInvites.get(targetId);
    if (!fromId) return { ok: false, error: 'Nenhum convite pendente' };
    this.pendingInvites.delete(targetId);
    if (!this.playerParty.get(fromId)) this.create(fromId);
    const partyId = this.playerParty.get(fromId)!;
    const party = this.parties.get(partyId)!;
    if (party.members.size >= 5) return { ok: false, error: 'Party cheia' };
    this.leave(targetId);
    party.members.add(targetId);
    this.playerParty.set(targetId, partyId);
    return { ok: true, party };
  }

  decline(targetId: string) {
    this.pendingInvites.delete(targetId);
  }

  leave(socketId: string) {
    const partyId = this.playerParty.get(socketId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;
    party.members.delete(socketId);
    this.playerParty.delete(socketId);
    if (party.members.size === 0) {
      this.parties.delete(partyId);
      return;
    }
    if (party.leaderId === socketId) {
      party.leaderId = Array.from(party.members)[0];
    }
  }

  kick(leaderId: string, targetId: string): { ok: boolean; error?: string } {
    const partyId = this.playerParty.get(leaderId);
    if (!partyId) return { ok: false, error: 'Sem party' };
    const party = this.parties.get(partyId)!;
    if (party.leaderId !== leaderId) return { ok: false, error: 'Só o líder pode expulsar' };
    if (!party.members.has(targetId)) return { ok: false, error: 'Não está na party' };
    this.leave(targetId);
    return { ok: true };
  }

  getParty(socketId: string): Party | null {
    const id = this.playerParty.get(socketId);
    return id ? this.parties.get(id) || null : null;
  }

  distributeXp(
    killerId: string,
    baseXp: number,
    players: Map<string, Player>,
    range = 400
  ): Array<{ id: string; xp: number }> {
    const party = this.getParty(killerId);
    const killer = players.get(killerId);
    if (!party || !killer || party.members.size <= 1) {
      return [{ id: killerId, xp: baseXp }];
    }
    const nearby: string[] = [];
    for (const mid of party.members) {
      const m = players.get(mid);
      if (!m || !m.alive) continue;
      if (m.mapId !== killer.mapId) continue;
      if (Math.hypot(m.x - killer.x, m.y - killer.y) <= range) nearby.push(mid);
    }
    if (nearby.length <= 1) return [{ id: killerId, xp: baseXp }];
    const share = Math.floor((baseXp * 1.1) / nearby.length);
    return nearby.map((id) => ({ id, xp: Math.max(1, share) }));
  }
}
