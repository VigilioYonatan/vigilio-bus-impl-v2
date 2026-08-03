export type AuthSessionRevokedReason =
  | "rotated"
  | "logout"
  | "logout_all"
  | "reuse_detected"
  | "user_inactive";

export type AuthSessionRecord = {
  id: number;
  user_id: number;
  jti: string;
  family_id: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
};

export type AuthSessionStoreDto = {
  user_id: number;
  jti: string;
  family_id: string;
  token_hash: string;
  expires_at: string;
  user_agent: string | null;
  ip_address: string | null;
};

export type AuthLoginAttemptWindowDto = {
  email: string;
  ip_address: string | null;
  since: string;
};

export type AuthLoginAttemptCountDto = {
  by_email: number;
  by_ip: number;
};

export interface IAuthSessionRepository {
  /** Persiste una sesion nueva tras login o rotacion. */
  store(body: AuthSessionStoreDto): Promise<void>;

  /** Busca por jti para validar un refresh token. Devuelve null si no existe. */
  findByJti(jti: string): Promise<AuthSessionRecord | null>;

  /**
   * Revoca una sesion concreta. Devuelve false si ya estaba revocada,
   * lo que permite detectar reuso sin una lectura extra (operacion atomica).
   */
  revokeByJti(
    jti: string,
    reason: AuthSessionRevokedReason,
    replaced_by_jti?: string,
  ): Promise<boolean>;

  /** Revoca la familia completa. Se usa al detectar reuso de un token robado. */
  revokeFamily(family_id: string, reason: AuthSessionRevokedReason): Promise<number>;

  /** Revoca todas las sesiones activas de un usuario (logout global). */
  revokeAllForUser(user_id: number, reason: AuthSessionRevokedReason): Promise<number>;

  /** Registra un intento de login fallido. */
  recordLoginAttempt(email: string, ip_address: string | null): Promise<void>;

  /** Cuenta intentos fallidos en la ventana indicada, por email y por IP. */
  countLoginAttempts(query: AuthLoginAttemptWindowDto): Promise<AuthLoginAttemptCountDto>;

  /** Limpia intentos de un email tras un login correcto. */
  clearLoginAttempts(email: string): Promise<void>;

  /** Borra sesiones expiradas y intentos antiguos. Lo invoca el job de mantenimiento. */
  purgeExpired(before: string): Promise<number>;
}
