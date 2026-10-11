import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  AUDIT_EXPORT_EVENTS,
  AUDIT_EXPORT_OPERATION,
} from "@/audit/application/constants/audit-export-events.constant";
import type { AuditExportRequestDto } from "@/audit/application/dtos/audit-export.request.dto";
import type {
  AuditExportStoreInput,
  AuditExportStoreResult,
  IAuditExportRepository,
} from "@/audit/application/repositories/audit-export.repository.interface";
import {
  type AuditExportFormat,
  type AuditExportStatus,
  auditExportInitialStatus,
} from "@/audit/application/schemas/audit-export.schema";
import type { TrustedTenantContext } from "@/audit/application/security/trusted-tenant-context";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";
import { type AuditExportRequestedPayload, outboxEventTable } from "./outbox-event.schema";
import { auditEventTable, auditExportTable } from "./schema";

/**
 * Proyeccion confirmada del export: identidad durable, estado inicial,
 * formato y timestamp UTC. Se listan columnas una a una para no acoplar el
 * contrato al schema completo ni filtrar columnas internas.
 */
const auditExportProjection = {
  format: auditExportTable.format,
  id: auditExportTable.id,
  requested_at: auditExportTable.requested_at,
  status: auditExportTable.status,
};

/**
 * Adapter Drizzle del agregado `audit_export`.
 *
 * Ejecuta la mutacion completa en una sola transaccion PostgreSQL (ADR-003):
 * 1. inserta la solicitud con su identidad durable de idempotencia;
 * 2. anexa la evidencia append-only en `audit_event` (actor, tenant, accion,
 *    recurso, `reason`, correlacion);
 * 3. confirma el row de outbox de `AuditExportRequested.v1`.
 *
 * La violacion de la unicidad de idempotencia (PostgreSQL 23505) es el guard
 * final de carreras: se traduce a la convergencia con el export ya existente
 * del mismo tenant/operacion/hash, sin dejar escapar nada del driver. Los
 * errores crudos quedan dentro del adapter.
 */
@Injectable()
export class AuditExportRepository implements IAuditExportRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  async store(
    input: AuditExportStoreInput,
    scope: TrustedTenantContext,
  ): Promise<AuditExportStoreResult> {
    const requestHash = auditExportRequestHash(input.request);

    try {
      return await this.db.transaction(async (tx) => {
        const [exportRow] = await tx
          .insert(auditExportTable)
          .values({
            actor_ids: input.request.actor_ids ?? null,
            actions: input.request.actions ?? null,
            correlation_id: input.correlationId,
            format: input.request.format,
            operation: AUDIT_EXPORT_OPERATION,
            range_from: input.request.from,
            range_to: input.request.to,
            request_hash: requestHash,
            resource_types: input.request.resource_types ?? null,
            status: auditExportInitialStatus,
            tenant_id: scope.tenantId,
          })
          .returning(auditExportProjection);

        if (!exportRow) {
          throw new Error("No se pudo persistir la solicitud de export");
        }

        await tx.insert(auditEventTable).values({
          action: AUDIT_EXPORT_OPERATION,
          actor_id: input.actorId,
          correlation_id: input.correlationId,
          metadata: null,
          reason: input.request.reason,
          resource_id: exportRow.id,
          resource_type: "audit_export",
          tenant_id: scope.tenantId,
        });

        await tx.insert(outboxEventTable).values({
          aggregate_id: exportRow.id,
          causation_id: null,
          correlation_id: input.correlationId,
          event_type: AUDIT_EXPORT_EVENTS.exportRequested.type,
          event_version: AUDIT_EXPORT_EVENTS.exportRequested.version,
          payload: auditExportRequestedPayload(exportRow.id, input.request),
          tenant_id: scope.tenantId,
        });

        return { reused: false, result: toAuditExportResult(exportRow) };
      });
    } catch (error) {
      if (!isAuditExportIdempotencyViolation(error)) {
        throw error;
      }

      // Repeticion logica concurrente o posterior: el export ya confirmado del
      // mismo tenant/operacion/hash es la identidad durable compartida.
      const existing = await this.findByRequestHash(scope, requestHash);

      if (!existing) {
        throw error;
      }

      return { reused: true, result: existing };
    }
  }

  /**
   * Resolucion de idempotencia: el predicado de tenant es el primero del
   * WHERE y completa la identidad durable (operacion + hash canonico). La
   * proyeccion es la misma que la de la mutacion.
   */
  private async findByRequestHash(scope: TrustedTenantContext, requestHash: string) {
    const [row] = await this.db
      .select(auditExportProjection)
      .from(auditExportTable)
      .where(
        and(
          eq(auditExportTable.tenant_id, scope.tenantId),
          eq(auditExportTable.operation, AUDIT_EXPORT_OPERATION),
          eq(auditExportTable.request_hash, requestHash),
        ),
      )
      .limit(1);

    return row ? toAuditExportResult(row) : null;
  }
}

/**
 * Hash canonico del request para la identidad durable de idempotencia
 * (tenant + operacion + hash). Canonicaliza orden y duplicados de los
 * arreglos de filtros (mismo conjunto = misma identidad logica) y serializa
 * con claves en orden fijo; `reason` participa porque forma parte gobernada
 * del comando sensible. El hash permanece server-side: nunca viaja en la
 * respuesta ni en logs.
 */
function auditExportRequestHash(request: AuditExportRequestDto): string {
  const payload = JSON.stringify({
    actions: normalizeFilterList(request.actions),
    actor_ids: normalizeFilterList(request.actor_ids),
    format: request.format,
    from: request.from,
    reason: request.reason,
    resource_types: normalizeFilterList(request.resource_types),
    to: request.to,
  });

  return createHash("sha256").update(payload).digest("hex");
}

function normalizeFilterList(values: string[] | undefined): string[] | null {
  if (!values || values.length === 0) {
    return null;
  }

  return [...new Set(values)].sort();
}

function auditExportRequestedPayload(
  exportId: string,
  request: AuditExportRequestDto,
): AuditExportRequestedPayload {
  return {
    actions: request.actions ?? null,
    actor_ids: request.actor_ids ?? null,
    export_id: exportId,
    format: request.format,
    from: request.from,
    resource_types: request.resource_types ?? null,
    to: request.to,
  };
}

function toAuditExportResult(row: {
  format: AuditExportFormat;
  id: string;
  requested_at: string;
  status: AuditExportStatus;
}): AuditExportStoreResult["result"] {
  return {
    export_id: row.id,
    format: row.format,
    requested_at: new Date(row.requested_at).toISOString(),
    status: row.status,
  };
}

/**
 * Detecta la violacion de la unicidad de idempotencia
 * `audit_exports_tenant_operation_request_hash_unique` (PostgreSQL 23505) sin
 * dejar escapar nada del driver: el unico efecto hacia arriba es la
 * convergencia durable con el export existente.
 */
function isAuditExportIdempotencyViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error) || error.code !== "23505") {
    return false;
  }

  return (
    "constraint" in error &&
    error.constraint === "audit_exports_tenant_operation_request_hash_unique"
  );
}
