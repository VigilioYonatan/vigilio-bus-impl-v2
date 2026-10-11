/**
 * Bloqueo fail-closed del alta de usuario (`identity.users-store`).
 *
 * El write set canonico exige persistir `user` + evidencia append-only de
 * auditoria en la misma transaccion (S6: la interfaz publica de append del
 * modulo `audit` no existe y `apps/bus-impl-v2/src/audit/**` esta fuera de
 * `allowed_paths`) y el valor inicial del ciclo de vida (D2: `PENDING` vs
 * `ACTIVE`) no tiene un valor confirmado por el owner. Mientras ambas
 * precondiciones no se resuelvan, el adapter no persiste ningun valor
 * improvisado ni simula la evidencia: falla cerrado con este error tipado y
 * la operacion no debe activarse en runtime.
 */
export class IdentityStoreBlockedError extends Error {
  constructor() {
    super("identity.users-store blocked pending D2 (initial status) and S6 (audit append)");
    this.name = "IdentityStoreBlockedError";
  }
}
