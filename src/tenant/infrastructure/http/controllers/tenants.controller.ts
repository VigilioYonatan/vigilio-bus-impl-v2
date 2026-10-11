import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import {
  ApiAuthRequiredResponse,
  ApiConflictBusinessResponse,
  ApiForbiddenBusinessResponse,
  ApiResourceNotFoundResponse,
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { CORRELATION_ID_HEADER } from "@/shared/infrastructure/http/middleware/correlation-id.middleware";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import { ZodQueryPipe } from "@/shared/infrastructure/http/pipes/zod-query.pipe";
import type { AuthenticatedRequest } from "@/shared/infrastructure/security/authenticated-request";
import { Roles } from "@/shared/infrastructure/security/roles.decorator";
import { TenantsIndexQueryDocDto } from "@/tenant/application/dtos/tenants-index.request.doc";
import {
  type TenantsIndexQueryDto,
  tenantsIndexQueryDto,
} from "@/tenant/application/dtos/tenants-index.request.dto";
import { TenantsIndexResponseDocDto } from "@/tenant/application/dtos/tenants-index.response.doc";
import type { TenantsIndexResponseDto } from "@/tenant/application/dtos/tenants-index.response.dto";
import {
  type TenantsShowParamsDto,
  tenantsShowParamsDto,
} from "@/tenant/application/dtos/tenants-show.request.dto";
import { TenantsShowResponseDocDto } from "@/tenant/application/dtos/tenants-show.response.doc";
import type { TenantsShowResponseDto } from "@/tenant/application/dtos/tenants-show.response.dto";
import { TenantsStoreRequestDocDto } from "@/tenant/application/dtos/tenants-store.request.doc";
import {
  type TenantsStoreRequestDto,
  tenantsStoreRequestDto,
} from "@/tenant/application/dtos/tenants-store.request.dto";
import { TenantsStoreResponseDocDto } from "@/tenant/application/dtos/tenants-store.response.doc";
import type { TenantsStoreResponseDto } from "@/tenant/application/dtos/tenants-store.response.dto";
import { TenantsSuspendRequestDocDto } from "@/tenant/application/dtos/tenants-suspend.request.doc";
import {
  type TenantsSuspendParamsDto,
  type TenantsSuspendRequestDto,
  tenantsSuspendParamsDto,
  tenantsSuspendRequestDto,
} from "@/tenant/application/dtos/tenants-suspend.request.dto";
import { TenantsSuspendResponseDocDto } from "@/tenant/application/dtos/tenants-suspend.response.doc";
import type { TenantsSuspendResponseDto } from "@/tenant/application/dtos/tenants-suspend.response.dto";
import { TenantsUpdateRequestDocDto } from "@/tenant/application/dtos/tenants-update.request.doc";
import {
  type TenantsUpdateParamsDto,
  type TenantsUpdateRequestDto,
  tenantsUpdateParamsDto,
  tenantsUpdateRequestDto,
} from "@/tenant/application/dtos/tenants-update.request.dto";
import { TenantsUpdateResponseDocDto } from "@/tenant/application/dtos/tenants-update.response.doc";
import type { TenantsUpdateResponseDto } from "@/tenant/application/dtos/tenants-update.response.dto";
import type { StepUpApprovalContextResolver } from "@/tenant/application/security/step-up-approval-context";
import { TENANT_STEP_UP_APPROVAL_CONTEXT_RESOLVER } from "@/tenant/application/security/step-up-approval-context.token";
import { toTenantsIndexActor } from "@/tenant/application/security/tenants-index-capability";
import { toTenantsShowActor } from "@/tenant/application/security/tenants-show-capability";
import { toTenantsStoreActor } from "@/tenant/application/security/tenants-store-capability";
import { toTenantsSuspendActor } from "@/tenant/application/security/tenants-suspend-capability";
import { toTenantsUpdateActor } from "@/tenant/application/security/tenants-update-capability";
import { TenantApplicationService } from "@/tenant/application/service/tenant.application-service";

@ApiTags("tenants")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiForbiddenBusinessResponse()
@ApiUnexpectedErrorResponse()
@Roles("admin")
@Controller("tenants")
export class TenantsController {
  constructor(
    @Inject(TenantApplicationService)
    private readonly service: TenantApplicationService,
    @Inject(TENANT_STEP_UP_APPROVAL_CONTEXT_RESOLVER)
    private readonly stepUpApprovalContext: StepUpApprovalContextResolver,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar tenants autorizados del registro global" })
  @ApiQuery({ type: TenantsIndexQueryDocDto })
  @ApiValidationErrorResponse()
  @ZodResponse({ status: 200, type: TenantsIndexResponseDocDto })
  index(
    @Query(new ZodQueryPipe(tenantsIndexQueryDto)) query: TenantsIndexQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TenantsIndexResponseDto> {
    return this.service.index(query, toTenantsIndexActor(request.user));
  }

  @Get(":tenantId")
  @Roles("admin")
  @ApiOperation({ summary: "Obtener un tenant autorizado del registro global" })
  @ApiParam({ format: "uuid", name: "tenantId", type: String })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Tenant")
  @ZodResponse({ status: 200, type: TenantsShowResponseDocDto })
  show(
    @Param(new ZodPipe(tenantsShowParamsDto)) params: TenantsShowParamsDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TenantsShowResponseDto> {
    return this.service.show(params, toTenantsShowActor(request.user));
  }

  @Post()
  @Roles("admin")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Crear un tenant atomico del registro global" })
  @ApiBody({ type: TenantsStoreRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiConflictBusinessResponse("Ya existe un tenant con la identidad solicitada.")
  @ZodResponse({ status: 201, type: TenantsStoreResponseDocDto })
  store(
    @Body(new ZodPipe(tenantsStoreRequestDto)) body: TenantsStoreRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TenantsStoreResponseDto> {
    return this.service.store(body, toTenantsStoreActor(request.user));
  }

  @Patch(":tenantId")
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Editar los campos mutables de un tenant del registro global" })
  @ApiParam({ format: "uuid", name: "tenantId", type: String })
  @ApiBody({ type: TenantsUpdateRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Tenant")
  @ApiConflictBusinessResponse(
    "La version esperada ya no es la vigente; refresque el estado autoritativo y reintente sin sobrescribir.",
  )
  @ZodResponse({ status: 200, type: TenantsUpdateResponseDocDto })
  update(
    @Param(new ZodPipe(tenantsUpdateParamsDto)) params: TenantsUpdateParamsDto,
    @Body(new ZodPipe(tenantsUpdateRequestDto)) body: TenantsUpdateRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TenantsUpdateResponseDto> {
    return this.service.update(
      params,
      body,
      toTenantsUpdateActor(request.user),
      this.correlationIdFrom(request),
    );
  }

  @Post(":tenantId/suspend")
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Suspender un tenant del registro global (fail-closed para nuevas mutaciones)",
  })
  @ApiParam({ format: "uuid", name: "tenantId", type: String })
  @ApiBody({ type: TenantsSuspendRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Tenant")
  @ApiConflictBusinessResponse(
    "La version esperada ya no es la vigente o el estado actual no permite suspender.",
  )
  @ZodResponse({ status: 200, type: TenantsSuspendResponseDocDto })
  async suspend(
    @Param(new ZodPipe(tenantsSuspendParamsDto)) params: TenantsSuspendParamsDto,
    @Body(new ZodPipe(tenantsSuspendRequestDto)) body: TenantsSuspendRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TenantsSuspendResponseDto> {
    const stepUpApproval = await this.stepUpApprovalContext.resolve();

    return this.service.suspend(
      params,
      body,
      toTenantsSuspendActor(request.user),
      stepUpApproval,
      this.correlationIdFrom(request),
    );
  }

  /**
   * Correlacion emitida por el middleware global (`x-correlation-id`). `null`
   * solo fuera del pipeline HTTP; la evidencia de auditoria bloqueada (S6) la
   * reutilizara como identidad de trazabilidad cuando exista.
   */
  private correlationIdFrom(request: AuthenticatedRequest): string | null {
    const header = request.headers[CORRELATION_ID_HEADER];

    return typeof header === "string" && header.length > 0 ? header : null;
  }
}
