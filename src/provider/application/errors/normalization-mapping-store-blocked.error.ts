/**
 * Bloqueo fail-closed del alta de mapeos de normalizacion
 * (`provider.normalization-mappings-store`).
 *
 * El write set canonico exige persistir `normalization_mapping` + evidencia
 * append-only de auditoria en la misma transaccion (S6: la interfaz publica de
 * append del modulo `audit` no existe y `apps/bus-impl-v2/src/audit/**` esta
 * fuera de `allowed_paths`), la identidad de negocio durable (D2) y el valor
 * inicial del ciclo de vida (D3) no estan confirmados por el owner y la
 * migracion versionada (S2) aun no materializa la tabla. Mientras esas
 * precondiciones no se resuelvan, el adapter no persiste ningun valor
 * improvisado ni simula la evidencia: falla cerrado con este error tipado y la
 * operacion no debe activarse en runtime.
 */
export class NormalizationMappingStoreBlockedError extends Error {
  constructor() {
    super(
      "provider.normalization-mappings-store blocked pending D2/D3 (identity/lifecycle), S2 (versioned migration) and S6 (audit append)",
    );
    this.name = "NormalizationMappingStoreBlockedError";
  }
}
