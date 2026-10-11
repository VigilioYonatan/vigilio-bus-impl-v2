/**
 * Bloqueo fail-closed del alta de cuentas de proveedor
 * (`provider.provider-accounts-store`).
 *
 * El write set canonico exige persistir `provider_account` + evidencia
 * append-only de auditoria en la misma transaccion (S6: la interfaz publica
 * de append del modulo `audit` no existe y `apps/bus-impl-v2/src/audit/**`
 * esta fuera de `allowed_paths`), la identidad de negocio durable tenant-local
 * (D4), el valor inicial del ciclo de vida (D5) y la exposicion de
 * `secret_ref` en la proyeccion publica (D6) no estan confirmados por el
 * owner y la migracion versionada (S2) aun no materializa la tabla. Mientras
 * esas precondiciones no se resuelvan, el adapter no persiste ningun valor
 * improvisado ni simula la evidencia: falla cerrado con este error tipado y la
 * operacion no debe activarse en runtime.
 */
export class ProviderAccountStoreBlockedError extends Error {
  constructor() {
    super(
      "provider.provider-accounts-store blocked pending D4/D5/D6 (identity/lifecycle/secret exposure), S2 (versioned migration) and S6 (audit append)",
    );
    this.name = "ProviderAccountStoreBlockedError";
  }
}
