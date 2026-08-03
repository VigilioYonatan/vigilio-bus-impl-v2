import {
  index,
  inet,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Sesiones de refresh token con rotacion y deteccion de reuso (OAuth 2.0 Security BCP, RFC 9700).
 *
 * Cada refresh token emitido crea una fila. Al renovar:
 * 1. Se marca la fila actual como revocada y se apunta `replaced_by_jti` al token nuevo.
 * 2. Se inserta una fila nueva con el mismo `family_id`.
 *
 * Si llega un `jti` que ya estaba revocado, significa que alguien reuso un token
 * robado: se revoca la familia completa. Esa es la razon de existir de `family_id`.
 */
export const authSessionTable = pgTable(
  "auth_sessions",
  {
    id: serial("id").primaryKey(),
    // `integer` y no `bigint`: `users.id` es `serial`, que en PostgreSQL es integer.
    // Un bigint aqui obligaria a un cast en cada join y ocultaria el desajuste.
    user_id: integer("user_id").notNull(),
    // jti del refresh token. Unico global: es la clave de revocacion.
    jti: varchar("jti", { length: 64 }).notNull(),
    // Agrupa todos los tokens derivados de un mismo login.
    family_id: varchar("family_id", { length: 64 }).notNull(),
    // Nunca guardamos el token; solo su hash SHA-256 para poder auditar sin poder reusarlo.
    token_hash: varchar("token_hash", { length: 64 }).notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
    // Motivo de revocacion: rotated | logout | logout_all | reuse_detected | user_inactive
    revoked_reason: varchar("revoked_reason", { length: 32 }),
    replaced_by_jti: varchar("replaced_by_jti", { length: 64 }),
    // Contexto para auditoria. No es PII sensible pero se trunca por seguridad.
    user_agent: varchar("user_agent", { length: 255 }),
    ip_address: inet("ip_address"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("auth_sessions_jti_unique").on(table.jti),
    index("auth_sessions_family_id_idx").on(table.family_id),
    index("auth_sessions_user_id_idx").on(table.user_id),
    // Soporta el barrido de sesiones expiradas sin escanear la tabla completa.
    index("auth_sessions_expires_at_idx").on(table.expires_at),
  ],
);

/**
 * Intentos de login fallidos para frenar fuerza bruta y credential stuffing.
 *
 * Vive en PostgreSQL a proposito: un contador en memoria no sirve en Lambda,
 * donde cada invocacion puede caer en un contenedor distinto. Compartir el
 * estado en la base es lo unico que funciona en serverless sin anadir Redis.
 */
export const authLoginAttemptTable = pgTable(
  "auth_login_attempts",
  {
    id: serial("id").primaryKey(),
    // Se normaliza a minusculas antes de insertar. Puede no existir como usuario.
    email: varchar("email", { length: 160 }).notNull(),
    ip_address: inet("ip_address"),
    attempted_at: timestamp("attempted_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("auth_login_attempts_email_attempted_at_idx").on(table.email, table.attempted_at),
    index("auth_login_attempts_ip_attempted_at_idx").on(table.ip_address, table.attempted_at),
  ],
);
