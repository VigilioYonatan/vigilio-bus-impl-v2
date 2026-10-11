/**
 * Identificador canonico de la operacion `provider.disable-provider`
 * (`BR-PROVIDER-DISABLE-PROVIDER-001` / `EP-PROVIDER-DISABLE-PROVIDER-001`).
 *
 * Se usa como clase estable de `action` en telemetria y como identificador de
 * la evidencia de auditoria (write set canonico: transicion de `provider` +
 * `audit_event` append-only con el motivo gobernado); jamas transporta datos
 * del payload (`reason` no se registra como label ni como contenido).
 */
export const PROVIDER_DISABLE_PROVIDER_OPERATION = "provider.disable-provider";
