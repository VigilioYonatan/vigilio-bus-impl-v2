/**
 * Bloqueo fail-closed de la deshabilitacion de provider
 * (`provider.disable-provider`).
 *
 * El write set canonico exige persistir la transicion del agregado
 * (`status = DISABLED`, `version + 1`, `updated_at` avanzado, sin eliminar
 * historial) + evidencia append-only de auditoria en la misma transaccion
 * (S6: la interfaz publica de append del modulo `audit` no existe y
 * `apps/bus-impl-v2/src/audit/**` esta fuera de `allowed_paths`) y la migracion
 * versionada (S2) aun no materializa la tabla `providers`. Mientras ambas
 * precondiciones no se resuelvan, el adapter no escribe un estado parcial, no
 * escribe la tabla ajena ni simula la evidencia: falla cerrado con este error
 * tipado (espejo del `ProviderStoreBlockedError` materializado) y la operacion
 * no debe activarse en runtime.
 */
export class ProviderDisableBlockedError extends Error {
  constructor() {
    super(
      "provider.disable-provider blocked pending S6 (audit append) and S2 (versioned migration)",
    );
    this.name = "ProviderDisableBlockedError";
  }
}
