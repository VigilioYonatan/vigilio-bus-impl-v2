/**
 * Conflicto durable de identidad de negocio del usuario.
 *
 * La lanza el adapter Drizzle al traducir la violacion del constraint
 * `identity_users_tenant_email_unique` (codigo PostgreSQL 23505); el error
 * crudo del driver nunca cruza hacia capas superiores. El application service
 * la mapea al resultado canonico `BUSINESS_IDENTITY_CONFLICT` (409) sin
 * filtrar detalles SQL, y la base de datos es el guard final ante carreras.
 * La traduccion se activa junto con el insert, bloqueado hoy por D2/S6.
 */
export class UserIdentityConflictError extends Error {
  constructor() {
    super("User business identity conflict");
    this.name = "UserIdentityConflictError";
  }
}
