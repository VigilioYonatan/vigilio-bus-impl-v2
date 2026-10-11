import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AuditExportRequestDocDto } from "@/audit/application/dtos/audit-export.request.doc";
import {
  type AuditExportRequestDto,
  auditExportRequestDto,
} from "@/audit/application/dtos/audit-export.request.dto";
import { AuditExportResponseDocDto } from "@/audit/application/dtos/audit-export.response.doc";
import type { AuditExportResponseDto } from "@/audit/application/dtos/audit-export.response.dto";
import { toAuditExportActor } from "@/audit/application/security/audit-export-capability";
import type { StepUpApprovalContextResolver } from "@/audit/application/security/step-up-approval-context";
import { STEP_UP_APPROVAL_CONTEXT_RESOLVER } from "@/audit/application/security/step-up-approval-context.token";
import type { TrustedTenantContextResolver } from "@/audit/application/security/trusted-tenant-context";
import { TRUSTED_TENANT_CONTEXT_RESOLVER } from "@/audit/application/security/trusted-tenant-context.token";
import { AuditExportApplicationService } from "@/audit/application/service/audit-export.application-service";
import {
  ApiAuthRequiredResponse,
  ApiForbiddenBusinessResponse,
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { CORRELATION_ID_HEADER } from "@/shared/infrastructure/http/middleware/correlation-id.middleware";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import type { AuthenticatedRequest } from "@/shared/infrastructure/security/authenticated-request";
import { Roles } from "@/shared/infrastructure/security/roles.decorator";

/**
 * `POST /audit-exports` (`EP-AUDIT-EXPORT-AUDIT-001`): solicita un export
 * auditable y acotado de eventos de auditoria.
 *
 * El controller es solo transporte: guards/contexto, validacion del body con
 * el contrato compartido, una unica invocacion al service y declaracion
 * OpenAPI. La respuesta declara aceptacion asincrona (202): el artefacto lo
 * genera el worker; jamas se expone aqui. El rol visible es usabilidad: la
 * autorizacion real (capability + tenant de confianza + step-up) la resuelve
 * el backend en cada ejecucion.
 */
@ApiTags("audit")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiUnexpectedErrorResponse()
@Roles("admin", "auditor")
@Controller("audit-exports")
export class AuditExportsController {
  constructor(
    @Inject(AuditExportApplicationService)
    private readonly service: AuditExportApplicationService,
    @Inject(TRUSTED_TENANT_CONTEXT_RESOLVER)
    private readonly tenantContext: TrustedTenantContextResolver,
    @Inject(STEP_UP_APPROVAL_CONTEXT_RESOLVER)
    private readonly stepUpApprovalContext: StepUpApprovalContextResolver,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Solicitar un export auditable y acotado de eventos de auditoria" })
  @ApiBody({ type: AuditExportRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiForbiddenBusinessResponse()
  @ZodResponse({ status: 202, type: AuditExportResponseDocDto })
  async store(
    @Body(new ZodPipe(auditExportRequestDto)) body: AuditExportRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AuditExportResponseDto> {
    const [scope, stepUpApproval] = await Promise.all([
      this.tenantContext.resolve(),
      this.stepUpApprovalContext.resolve(),
    ]);

    return this.service.store(
      body,
      toAuditExportActor(request.user),
      scope,
      stepUpApproval,
      this.correlationIdFrom(request),
    );
  }

  /**
   * Correlacion emitida por el middleware global (`x-correlation-id`). `null`
   * solo fuera del pipeline HTTP; el service genera una identidad local en ese
   * caso para no perder trazabilidad de la evidencia.
   */
  private correlationIdFrom(request: AuthenticatedRequest): string | null {
    const header = request.headers[CORRELATION_ID_HEADER];

    return typeof header === "string" && header.length > 0 ? header : null;
  }
}
