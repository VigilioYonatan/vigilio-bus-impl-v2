/**
 * Conflicto durable de identidad de negocio del agregado `provider`.
 *
 * La lanza el adapter Drizzle al traducir la violacion del constraint
 * tenant-local `providers_tenant_code_unique` (codigo PostgreSQL 23505); el
 * error crudo del driver nunca cruza hacia capas superiores. El application
 * service la mapea al resultado canonico `BUSINESS_IDENTITY_CONFLICT` (409)
 * sin filtrar detalles SQL, y la base de datos sigue siendo el guard final
 * ante carreras.
 */
export class ProviderIdentityConflictError extends Error {
  constructor() {
    super("Provider business identity conflict");
    this.name = "ProviderIdentityConflictError";
  }
}
