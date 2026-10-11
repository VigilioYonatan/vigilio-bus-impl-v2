import type { AuditExportRequestDto } from "../dtos/audit-export.request.dto";
import type { AuditExportResponseDto } from "../dtos/audit-export.response.dto";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";

/**
 * Entrada de la mutacion `store`.
 *
 * El request ya esta validado por el contrato; el actor y la correlacion
 * provienen de la sesion de confianza. `tenant_id` no aparece aqui a
 * proposito: el alcance viaja como argumento obligatorio y separado para que
 * ningun valor del body pueda ampliarlo.
 */
export type AuditExportStoreInput = {
  request: AuditExportRequestDto;
  actorId: string;
  correlationId: string;
};

/**
 * Resultado de la mutacion: la identidad durable del export confirmada por
 * PostgreSQL y si la solicitud convergio a un export ya existente (repeticion
 * logica con la misma identidad de idempotencia) o creo uno nuevo.
 */
export type AuditExportStoreResult = {
  result: AuditExportResponseDto["result"];
  reused: boolean;
};

/**
 * Puerto de mutacion del agregado `audit_export`.
 *
 * Operacion purpose-specific: dentro de una unica transaccion persiste la
 * solicitud (con su identidad durable de idempotencia: tenant + operacion +
 * hash canonico del request), anexa la evidencia append-only en `audit_event`
 * y confirma el row de `outbox_events` de `AuditExportRequested.v1`. No existe
 * una API generica de escritura y el scope de tenant es un argumento
 * obligatorio: la posesion de identificadores jamas amplia el alcance. Una
 * repeticion logica converge al mismo resultado durable o falla de forma
 * determinista (la unicidad de base de datos es el guard final de carreras).
 */
export interface IAuditExportRepository {
  store(input: AuditExportStoreInput, scope: TrustedTenantContext): Promise<AuditExportStoreResult>;
}
