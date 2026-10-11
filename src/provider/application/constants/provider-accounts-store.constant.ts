/**
 * Identificador canonico de la operacion `provider.provider-accounts-store`
 * (`BR-PROVIDER-PROVIDER-ACCOUNTS-STORE-001` /
 * `EP-PROVIDER-PROVIDER-ACCOUNTS-STORE-001`).
 *
 * Se usa como clase estable de `action` en telemetria y como identificador de
 * la evidencia de auditoria (write set canonico: `provider_account` +
 * `audit_event` append-only); jamas transporta datos del payload (los campos
 * de la cuenta — incluido `secret_ref` — no se registran como labels ni como
 * contenido).
 */
export const PROVIDER_ACCOUNTS_STORE_OPERATION = "provider.provider-accounts-store";
