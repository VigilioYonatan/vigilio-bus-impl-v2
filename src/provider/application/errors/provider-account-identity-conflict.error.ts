/**
 * Conflicto durable de identidad de negocio del agregado `provider_account`.
 *
 * La lanzara el adapter Drizzle al traducir la violacion del constraint
 * tenant-local de identidad (codigo PostgreSQL 23505) una vez confirmada D4 y
 * materializada la migracion versionada (S2); el error crudo del driver nunca
 * cruza hacia capas superiores. El application service la mapea al resultado
 * canonico `BUSINESS_IDENTITY_CONFLICT` (409) sin filtrar detalles SQL, y la
 * base de datos sera el guard final ante carreras de alta duplicada. Ningun
 * nombre fisico de constraint se inventa mientras D4 este sin confirmar.
 */
export class ProviderAccountIdentityConflictError extends Error {
  constructor() {
    super("Provider account business identity conflict");
    this.name = "ProviderAccountIdentityConflictError";
  }
}
