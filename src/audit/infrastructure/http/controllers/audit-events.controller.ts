import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AuditIndexQueryDocDto } from "@/audit/application/dtos/audit-index.request.doc";
import {
  type AuditIndexQueryDto,
  auditIndexQueryDto,
} from "@/audit/application/dtos/audit-index.request.dto";
import { AuditIndexResponseDocDto } from "@/audit/application/dtos/audit-index.response.doc";
import type { AuditIndexResponseDto } from "@/audit/application/dtos/audit-index.response.dto";
import {
  type AuditShowParamsDto,
  auditShowParamsDto,
} from "@/audit/application/dtos/audit-show.request.dto";
import { AuditShowResponseDocDto } from "@/audit/application/dtos/audit-show.response.doc";
import type { AuditShowResponseDto } from "@/audit/application/dtos/audit-show.response.dto";
import type { TrustedTenantContextResolver } from "@/audit/application/security/trusted-tenant-context";
import { TRUSTED_TENANT_CONTEXT_RESOLVER } from "@/audit/application/security/trusted-tenant-context.token";
import { AuditEventApplicationService } from "@/audit/application/service/audit-event.application-service";
import {
  ApiAuthRequiredResponse,
  ApiForbiddenBusinessResponse,
  ApiResourceNotFoundResponse,
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import { ZodQueryPipe } from "@/shared/infrastructure/http/pipes/zod-query.pipe";
import { Roles } from "@/shared/infrastructure/security/roles.decorator";

@ApiTags("audit")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiUnexpectedErrorResponse()
@Roles("admin", "auditor")
@Controller("audit-events")
export class AuditEventsController {
  constructor(
    @Inject(AuditEventApplicationService)
    private readonly service: AuditEventApplicationService,
    @Inject(TRUSTED_TENANT_CONTEXT_RESOLVER)
    private readonly tenantContext: TrustedTenantContextResolver,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar eventos de auditoria autorizados del tenant" })
  @ApiQuery({ type: AuditIndexQueryDocDto })
  @ApiValidationErrorResponse()
  @ApiForbiddenBusinessResponse()
  @ZodResponse({ status: 200, type: AuditIndexResponseDocDto })
  async index(
    @Query(new ZodQueryPipe(auditIndexQueryDto)) query: AuditIndexQueryDto,
  ): Promise<AuditIndexResponseDto> {
    return this.service.index(query, await this.tenantContext.resolve());
  }

  @Get(":auditEventId")
  @ApiOperation({ summary: "Mostrar un evento de auditoria autorizado del tenant" })
  @ApiParam({ format: "uuid", name: "auditEventId", type: String })
  @ApiValidationErrorResponse()
  @ApiForbiddenBusinessResponse()
  @ApiResourceNotFoundResponse("Evento de auditoria")
  @ZodResponse({ status: 200, type: AuditShowResponseDocDto })
  async show(
    @Param(new ZodPipe(auditShowParamsDto)) params: AuditShowParamsDto,
  ): Promise<AuditShowResponseDto> {
    return this.service.show(params.auditEventId, await this.tenantContext.resolve());
  }
}
