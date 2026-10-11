import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { AuditIndexQueryDto } from "../dtos/audit-index.request.dto";
import type { AuditIndexResponseDto } from "../dtos/audit-index.response.dto";
import type { AuditShowResponseDto } from "../dtos/audit-show.response.dto";
import type { IAuditEventRepository } from "../repositories/audit-event.repository.interface";
import { AUDIT_EVENT_REPOSITORY } from "../repositories/audit-event.repository.token";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";

@Injectable()
export class AuditEventApplicationService {
  private readonly logger = new Logger(AuditEventApplicationService.name);

  constructor(
    @Inject(AUDIT_EVENT_REPOSITORY)
    private readonly repository: IAuditEventRepository,
  ) {}

  /**
   * Lista eventos de auditoria del tenant de confianza.
   *
   * Deny-by-default: sin contexto de tenant resuelto no existe lectura valida
   * y se responde 403 sin revelar si existen recursos de otros tenants. La
   * operacion es de solo lectura: no escribe estado canonico.
   */
  async index(
    query: AuditIndexQueryDto,
    scope: TrustedTenantContext | null,
  ): Promise<AuditIndexResponseDto> {
    if (!scope) {
      this.logger.warn(
        { action: "audit.audit-index", result: "tenant_context_missing" },
        "Audit index denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    const response = await this.repository.index(query, scope);

    this.logger.log(
      { action: "audit.audit-index", count: response.count, result: "success" },
      "Listed audit events",
    );

    return response;
  }

  /**
   * Recupera un unico evento de auditoria del tenant de confianza.
   *
   * Deny-by-default: sin contexto de tenant resuelto se responde 403 sin
   * revelar si existe algun recurso. Un resultado nulo (ausente, de otro
   * tenant o global) produce un 404 identico que no revela la existencia de
   * recursos ajenos: la superficie jamas permite inferir si un recurso existe
   * en otro tenant. La operacion es de solo lectura: no escribe estado
   * canonico ni deja efectos ocultos en una repeticion.
   */
  async show(
    auditEventId: string,
    scope: TrustedTenantContext | null,
  ): Promise<AuditShowResponseDto> {
    if (!scope) {
      this.logger.warn(
        { action: "audit.audit-show", result: "tenant_context_missing" },
        "Audit show denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    const result = await this.repository.show(auditEventId, scope);

    if (!result) {
      this.logger.warn(
        { action: "audit.audit-show", result: "not_found" },
        "Audit event not found within trusted tenant scope",
      );

      throw new NotFoundException("Evento de auditoría no encontrado");
    }

    this.logger.log({ action: "audit.audit-show", result: "success" }, "Showed audit event");

    return {
      success: true,
      result,
    };
  }
}
