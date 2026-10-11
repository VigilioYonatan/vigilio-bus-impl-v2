import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { AUDIT_EXPORT_OPERATION } from "../constants/audit-export-events.constant";
import type { AuditExportRequestDto } from "../dtos/audit-export.request.dto";
import type { AuditExportResponseDto } from "../dtos/audit-export.response.dto";
import type { IAuditExportRepository } from "../repositories/audit-export.repository.interface";
import { AUDIT_EXPORT_REPOSITORY } from "../repositories/audit-export.repository.token";
import { auditExportStepUpApprovalRequired } from "../schemas/audit-export.schema";
import { type AuditExportActor, canRequestAuditExport } from "../security/audit-export-capability";
import {
  isStepUpApprovalSatisfied,
  type StepUpApprovalContext,
} from "../security/step-up-approval-context";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";

@Injectable()
export class AuditExportApplicationService {
  private readonly logger = new Logger(AuditExportApplicationService.name);

  constructor(
    @Inject(AUDIT_EXPORT_REPOSITORY)
    private readonly repository: IAuditExportRepository,
  ) {}

  /**
   * Solicita un export auditable y acotado de eventos de auditoria.
   *
   * Precondiciones fail-closed, en orden:
   * 1. capability `audit:export:audit` (sin actor autorizado -> 403);
   * 2. contexto de tenant de confianza (ausente -> 403 sin revelar existencia);
   * 3. step-up/aprobacion no verificable -> 403 `STEP_UP_OR_APPROVAL_REQUIRED`.
   *
   * La validacion estructural (datetimes, `to >= from`, `format`, limites de
   * campos) ya ocurrio en el borde con el schema compartido; aqui se revalida
   * el invariante de orden sobre datos parseados, porque la validacion del
   * endpoint no reemplaza la validacion de negocio (misma regla que exige el
   * status/version desde el store autoritativo).
   *
   * La mutacion ocurre dentro de la transaccion del repositorio (registro de
   * export + evidencia append-only + outbox) y una repeticion logica converge
   * por identidad durable (tenant + operacion + hash canonico), nunca duplica
   * efectos. La telemetria de esta operacion jamas registra payloads, filtros,
   * `reason` ni identificadores de alta cardinalidad: solo accion y clase de
   * resultado.
   */
  async store(
    body: AuditExportRequestDto,
    actor: AuditExportActor | null,
    scope: TrustedTenantContext | null,
    stepUpApproval: StepUpApprovalContext | null,
    correlationId: string | null,
  ): Promise<AuditExportResponseDto> {
    if (actor === null || !canRequestAuditExport(actor)) {
      this.logger.warn(
        { action: AUDIT_EXPORT_OPERATION, result: "forbidden" },
        "Audit export denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!scope) {
      this.logger.warn(
        { action: AUDIT_EXPORT_OPERATION, result: "tenant_context_missing" },
        "Audit export denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    if (!isStepUpApprovalSatisfied(stepUpApproval)) {
      this.logger.warn(
        { action: AUDIT_EXPORT_OPERATION, result: "step_up_or_approval_required" },
        "Audit export denied pending step-up or approval",
      );

      throw new ForbiddenException(auditExportStepUpApprovalRequired);
    }

    if (Date.parse(body.to) < Date.parse(body.from)) {
      throw new BadRequestException("`to` debe ser mayor o igual que `from`");
    }

    const stored = await this.repository.store(
      {
        actorId: String(actor.id),
        correlationId: correlationId ?? randomUUID(),
        request: body,
      },
      scope,
    );

    this.logger.log(
      {
        action: AUDIT_EXPORT_OPERATION,
        result: stored.reused ? "duplicate_converged" : "success",
      },
      "Audit export requested",
    );

    return {
      success: true,
      result: stored.result,
    };
  }
}
