import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  AuthLoginAttemptCountDto,
  AuthLoginAttemptWindowDto,
  AuthSessionRecord,
  AuthSessionRevokedReason,
  AuthSessionStoreDto,
  IAuthSessionRepository,
} from "@/auth/application/repositories/auth-session.repository.interface";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";
import { authLoginAttemptTable, authSessionTable } from "./schema";

@Injectable()
export class AuthSessionRepository implements IAuthSessionRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  async store(body: AuthSessionStoreDto): Promise<void> {
    await this.db.insert(authSessionTable).values(body);
  }

  async findByJti(jti: string): Promise<AuthSessionRecord | null> {
    const [row] = await this.db
      .select({
        id: authSessionTable.id,
        user_id: authSessionTable.user_id,
        jti: authSessionTable.jti,
        family_id: authSessionTable.family_id,
        expires_at: authSessionTable.expires_at,
        revoked_at: authSessionTable.revoked_at,
        revoked_reason: authSessionTable.revoked_reason,
      })
      .from(authSessionTable)
      .where(eq(authSessionTable.jti, jti))
      .limit(1);

    return row ?? null;
  }

  /**
   * Revoca solo si sigue activa. El `isNull(revoked_at)` en el WHERE hace la
   * operacion atomica: si dos peticiones concurrentes presentan el mismo refresh
   * token, exactamente una recibe `true`. La otra recibe `false` y el servicio
   * la trata como reuso. Sin esto habria una condicion de carrera explotable.
   */
  async revokeByJti(
    jti: string,
    reason: AuthSessionRevokedReason,
    replaced_by_jti?: string,
  ): Promise<boolean> {
    const rows = await this.db
      .update(authSessionTable)
      .set({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
        replaced_by_jti: replaced_by_jti ?? null,
      })
      .where(and(eq(authSessionTable.jti, jti), isNull(authSessionTable.revoked_at)))
      .returning({ id: authSessionTable.id });

    return rows.length > 0;
  }

  async revokeFamily(family_id: string, reason: AuthSessionRevokedReason): Promise<number> {
    const rows = await this.db
      .update(authSessionTable)
      .set({ revoked_at: new Date().toISOString(), revoked_reason: reason })
      .where(and(eq(authSessionTable.family_id, family_id), isNull(authSessionTable.revoked_at)))
      .returning({ id: authSessionTable.id });

    return rows.length;
  }

  async revokeAllForUser(user_id: number, reason: AuthSessionRevokedReason): Promise<number> {
    const rows = await this.db
      .update(authSessionTable)
      .set({ revoked_at: new Date().toISOString(), revoked_reason: reason })
      .where(and(eq(authSessionTable.user_id, user_id), isNull(authSessionTable.revoked_at)))
      .returning({ id: authSessionTable.id });

    return rows.length;
  }

  async recordLoginAttempt(email: string, ip_address: string | null): Promise<void> {
    await this.db.insert(authLoginAttemptTable).values({ email, ip_address });
  }

  async countLoginAttempts(query: AuthLoginAttemptWindowDto): Promise<AuthLoginAttemptCountDto> {
    const [byEmail] = await this.db
      .select({ total: count() })
      .from(authLoginAttemptTable)
      .where(
        and(
          eq(authLoginAttemptTable.email, query.email),
          gte(authLoginAttemptTable.attempted_at, query.since),
        ),
      );

    if (!query.ip_address) {
      return { by_email: byEmail?.total ?? 0, by_ip: 0 };
    }

    const [byIp] = await this.db
      .select({ total: count() })
      .from(authLoginAttemptTable)
      .where(
        and(
          eq(authLoginAttemptTable.ip_address, query.ip_address),
          gte(authLoginAttemptTable.attempted_at, query.since),
        ),
      );

    return { by_email: byEmail?.total ?? 0, by_ip: byIp?.total ?? 0 };
  }

  async clearLoginAttempts(email: string): Promise<void> {
    await this.db.delete(authLoginAttemptTable).where(eq(authLoginAttemptTable.email, email));
  }

  async purgeExpired(before: string): Promise<number> {
    const sessions = await this.db
      .delete(authSessionTable)
      .where(lt(authSessionTable.expires_at, before))
      .returning({ id: authSessionTable.id });

    const attempts = await this.db
      .delete(authLoginAttemptTable)
      .where(lt(authLoginAttemptTable.attempted_at, before))
      .returning({ id: authLoginAttemptTable.id });

    return sessions.length + attempts.length;
  }

  /** Expuesto solo para diagnostico operativo; no forma parte del puerto. */
  async countActiveSessions(user_id: number): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(authSessionTable)
      .where(
        and(
          eq(authSessionTable.user_id, user_id),
          isNull(authSessionTable.revoked_at),
          gte(authSessionTable.expires_at, sql`now()`),
        ),
      );

    return row?.total ?? 0;
  }
}
