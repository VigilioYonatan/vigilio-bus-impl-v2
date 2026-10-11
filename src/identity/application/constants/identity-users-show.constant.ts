/**
 * Identificador canonico de la operacion `identity.users-show`
 * (`BR-IDENTITY-USERS-SHOW-001` / `EP-IDENTITY-USERS-SHOW-001`).
 *
 * Se usa como clase estable de `action` en telemetria; jamas transporta datos
 * del payload ni el identificador consultado como label (el usuario
 * consultado es PII gobernada y no se registra en logs ni metricas).
 */
export const IDENTITY_USERS_SHOW_OPERATION = "identity.users-show";
