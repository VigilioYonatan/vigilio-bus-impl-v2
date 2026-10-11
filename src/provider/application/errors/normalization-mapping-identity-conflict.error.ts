/**
 * Conflicto durable de identidad de negocio del agregado
 * `normalization_mapping`.
 *
 * La lanza el adapter Drizzle al traducir la violacion del constraint
 * tenant-local de identidad (codigo PostgreSQL 23505) una vez confirmada D2 y
 * materializada la migracion versionada (S2); el error crudo del driver nunca
 * cruza hacia capas superiores. El application service la mapea al resultado
 * canonico `BUSINESS_IDENTITY_CONFLICT` (409) sin filtrar detalles SQL, y la
 * base de datos sigue siendo el guard final ante carreras de alta duplicada.
 */
export class NormalizationMappingIdentityConflictError extends Error {
  constructor() {
    super("Normalization mapping business identity conflict");
    this.name = "NormalizationMappingIdentityConflictError";
  }
}
