/**
 * Identificador canonico de la operacion `identity.users-update`
 * (`BR-IDENTITY-USERS-UPDATE-001` / `EP-IDENTITY-USERS-UPDATE-001`).
 *
 * Se usa como clase estable de `action` en telemetria y como identificador de
 * la evidencia de auditoria; jamas transporta datos del payload ni el
 * identificador del usuario editado como label (es PII gobernada y no se
 * registra en logs ni metricas).
 */
export const IDENTITY_USERS_UPDATE_OPERATION = "identity.users-update";
