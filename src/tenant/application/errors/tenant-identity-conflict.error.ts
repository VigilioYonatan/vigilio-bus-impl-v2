/**
 * Conflicto durable de identidad de negocio del registro `tenant`.
 *
 * La lanza el adapter Drizzle al traducir la violacion del constraint global
 * `tenants_slug_unique` (codigo PostgreSQL 23505); el error crudo del driver
 * nunca cruza hacia capas superiores. El application service la mapea al
 * resultado canonico `BUSINESS_IDENTITY_CONFLICT` (409) sin filtrar detalles
 * SQL, y la base de datos sigue siendo el guard final ante carreras.
 */
export class TenantIdentityConflictError extends Error {
  constructor() {
    super("Tenant business identity conflict");
    this.name = "TenantIdentityConflictError";
  }
}
