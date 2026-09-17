/** V0.16 — Simple admin by username list or env ADMIN_USERS (comma-separated) */

const DEFAULT_ADMINS = (process.env.ADMIN_USERS || 'admin').split(',').map((s) => s.trim().toLowerCase());

export class AdminManager {
  private admins = new Set(DEFAULT_ADMINS);
  /** socketId -> is admin session (after login with admin account) */
  private adminSockets = new Set<string>();

  markIfAdmin(socketId: string, username: string) {
    if (this.admins.has(username.toLowerCase())) {
      this.adminSockets.add(socketId);
      return true;
    }
    return false;
  }

  clear(socketId: string) {
    this.adminSockets.delete(socketId);
  }

  isAdmin(socketId: string): boolean {
    return this.adminSockets.has(socketId);
  }

  addAdminUsername(name: string) {
    this.admins.add(name.toLowerCase());
  }
}
