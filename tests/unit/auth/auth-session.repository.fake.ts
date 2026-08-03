import type {
  AuthLoginAttemptCountDto,
  AuthLoginAttemptWindowDto,
  AuthSessionRecord,
  AuthSessionRevokedReason,
  AuthSessionStoreDto,
  IAuthSessionRepository,
} from "@/auth/application/repositories/auth-session.repository.interface";

type StoredSession = AuthSessionRecord & { token_hash: string };
type StoredAttempt = { email: string; ip_address: string | null; attempted_at: string };

/**
 * Doble en memoria del repositorio de sesiones.
 *
 * Reproduce la semantica que importa para los tests de seguridad: `revokeByJti`
 * solo tiene exito si la sesion sigue activa, igual que el `WHERE revoked_at IS NULL`
 * del adaptador Drizzle. Sin esa condicion los tests de deteccion de reuso pasarian
 * aunque la implementacion real fuese vulnerable a condiciones de carrera.
 */
export class FakeAuthSessionRepository implements IAuthSessionRepository {
  private readonly sessions = new Map<string, StoredSession>();
  private attempts: StoredAttempt[] = [];
  private sequence = 0;

  async store(body: AuthSessionStoreDto): Promise<void> {
    this.sequence += 1;
    this.sessions.set(body.jti, {
      id: this.sequence,
      user_id: body.user_id,
      jti: body.jti,
      family_id: body.family_id,
      token_hash: body.token_hash,
      expires_at: body.expires_at,
      revoked_at: null,
      revoked_reason: null,
    });
  }

  async findByJti(jti: string): Promise<AuthSessionRecord | null> {
    return this.sessions.get(jti) ?? null;
  }

  async revokeByJti(jti: string, reason: AuthSessionRevokedReason): Promise<boolean> {
    const session = this.sessions.get(jti);

    if (!session || session.revoked_at) {
      return false;
    }

    session.revoked_at = new Date().toISOString();
    session.revoked_reason = reason;

    return true;
  }

  async revokeFamily(family_id: string, reason: AuthSessionRevokedReason): Promise<number> {
    let revoked = 0;

    for (const session of this.sessions.values()) {
      if (session.family_id === family_id && !session.revoked_at) {
        session.revoked_at = new Date().toISOString();
        session.revoked_reason = reason;
        revoked += 1;
      }
    }

    return revoked;
  }

  async revokeAllForUser(user_id: number, reason: AuthSessionRevokedReason): Promise<number> {
    let revoked = 0;

    for (const session of this.sessions.values()) {
      if (session.user_id === user_id && !session.revoked_at) {
        session.revoked_at = new Date().toISOString();
        session.revoked_reason = reason;
        revoked += 1;
      }
    }

    return revoked;
  }

  async recordLoginAttempt(email: string, ip_address: string | null): Promise<void> {
    this.attempts.push({ email, ip_address, attempted_at: new Date().toISOString() });
  }

  async countLoginAttempts(query: AuthLoginAttemptWindowDto): Promise<AuthLoginAttemptCountDto> {
    const inWindow = this.attempts.filter((attempt) => attempt.attempted_at >= query.since);

    return {
      by_email: inWindow.filter((attempt) => attempt.email === query.email).length,
      by_ip: query.ip_address
        ? inWindow.filter((attempt) => attempt.ip_address === query.ip_address).length
        : 0,
    };
  }

  async clearLoginAttempts(email: string): Promise<void> {
    this.attempts = this.attempts.filter((attempt) => attempt.email !== email);
  }

  async purgeExpired(before: string): Promise<number> {
    let purged = 0;

    for (const [jti, session] of this.sessions) {
      if (session.expires_at < before) {
        this.sessions.delete(jti);
        purged += 1;
      }
    }

    return purged;
  }

  /** Helpers de asercion, no forman parte del puerto. */
  sessionByJti(jti: string): StoredSession | undefined {
    return this.sessions.get(jti);
  }

  activeSessionCount(): number {
    return [...this.sessions.values()].filter((session) => !session.revoked_at).length;
  }
}
