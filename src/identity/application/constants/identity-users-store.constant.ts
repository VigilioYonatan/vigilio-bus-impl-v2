/**
 * Identificador canonico de la operacion `identity.users-store`
 * (`BR-IDENTITY-USERS-STORE-001` / `EP-IDENTITY-USERS-STORE-001`).
 *
 * Se usa como clase estable de `action` en telemetria y como identificador de
 * la evidencia de auditoria; jamas transporta datos del payload (el email es
 * PII y no se registra ni como label ni como contenido).
 */
export const IDENTITY_USERS_STORE_OPERATION = "identity.users-store";
