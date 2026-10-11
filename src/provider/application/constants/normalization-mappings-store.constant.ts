/**
 * Identificador canonico de la operacion
 * `provider.normalization-mappings-store`
 * (`BR-PROVIDER-NORMALIZATION-MAPPINGS-STORE-001` /
 * `EP-PROVIDER-NORMALIZATION-MAPPINGS-STORE-001`).
 *
 * Se usa como clase estable de `action` en telemetria y como identificador de
 * la evidencia de auditoria (write set canonico: `normalization_mapping` +
 * `audit_event` append-only); jamas transporta datos del payload (los campos
 * del mapeo no se registran como labels ni como contenido).
 */
export const PROVIDER_NORMALIZATION_MAPPINGS_STORE_OPERATION =
  "provider.normalization-mappings-store";
