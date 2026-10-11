/**
 * Bloqueo fail-closed del alta de provider (`provider.providers-store`).
 *
 * El write set canonico exige persistir `provider` + evidencia append-only de
 * auditoria en la misma transaccion (S6: la interfaz publica de append del
 * modulo `audit` no existe y `apps/bus-impl-v2/src/audit/**` esta fuera de
 * `allowed_paths`) y el valor inicial del ciclo de vida (D1: `ACTIVE` vs
 * `DISABLED`) no tiene un valor confirmado por el owner. Mientras ambas
 * precondiciones no se resuelvan — y la migracion versionada (S2) no
 * materialice el schema — el adapter no persiste ningun valor improvisado ni
 * simula la evidencia: falla cerrado con este error tipado y la operacion no
 * debe activarse en runtime.
 */
export class ProviderStoreBlockedError extends Error {
  constructor() {
    super("provider.providers-store blocked pending D1 (initial status) and S6 (audit append)");
    this.name = "ProviderStoreBlockedError";
  }
}
