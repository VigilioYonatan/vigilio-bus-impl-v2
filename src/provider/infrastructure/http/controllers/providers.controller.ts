import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { DisableProviderRequestDocDto } from "@/provider/application/dtos/disable-provider.request.doc";
import {
  type DisableProviderParamsDto,
  type DisableProviderRequestDto,
  disableProviderParamsDto,
  disableProviderRequestDto,
} from "@/provider/application/dtos/disable-provider.request.dto";
import { DisableProviderResponseDocDto } from "@/provider/application/dtos/disable-provider.response.doc";
import type { DisableProviderResponseDto } from "@/provider/application/dtos/disable-provider.response.dto";
import { ProvidersIndexQueryDocDto } from "@/provider/application/dtos/providers-index.request.doc";
import {
  type ProvidersIndexQueryDto,
  providersIndexQueryDto,
} from "@/provider/application/dtos/providers-index.request.dto";
import { ProvidersIndexResponseDocDto } from "@/provider/application/dtos/providers-index.response.doc";
import type { ProvidersIndexResponseDto } from "@/provider/application/dtos/providers-index.response.dto";
import { ProvidersStoreRequestDocDto } from "@/provider/application/dtos/providers-store.request.doc";
import {
  type ProvidersStoreRequestDto,
  providersStoreRequestDto,
} from "@/provider/application/dtos/providers-store.request.dto";
import { ProvidersStoreResponseDocDto } from "@/provider/application/dtos/providers-store.response.doc";
import type { ProvidersStoreResponseDto } from "@/provider/application/dtos/providers-store.response.dto";
import { toDisableProviderActor } from "@/provider/application/security/disable-provider-capability";
import { toProvidersIndexActor } from "@/provider/application/security/providers-index-capability";
import { toProvidersStoreActor } from "@/provider/application/security/providers-store-capability";
import type { TrustedTenantContextResolver } from "@/provider/application/security/trusted-tenant-context";
import { TRUSTED_TENANT_CONTEXT_RESOLVER } from "@/provider/application/security/trusted-tenant-context.token";
import { ProviderApplicationService } from "@/provider/application/service/provider.application-service";
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

/**
 * `POST /providers` (`EP-PROVIDER-PROVIDERS-STORE-001`),
 * `GET /providers` (`EP-PROVIDER-PROVIDERS-INDEX-001`) y
 * `POST /providers/{providerId}/disable` (`EP-PROVIDER-DISABLE-PROVIDER-001`).
 *
 * El controller es solo transporte: guards/contexto, validacion de params,
 * query y body con el contrato compartido, resolucion del tenant de confianza
 * (NUNCA desde la request) y una unica invocacion al service. No existe una
 * operacion legacy `/providers` (sin colision de ruta: el `GET` del listado y
 * los `POST` de mutacion conviven en el mismo path); el registro de este
 * modulo en `src/app.module.ts` permanece fuera de `allowed_paths` (S1) y las
 * operaciones no estan activadas.
 */
@ApiTags("provider")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiForbiddenBusinessResponse()
@ApiUnexpectedErrorResponse()
@Roles("admin")
@Controller("providers")
export class ProvidersController {
  constructor(
    @Inject(ProviderApplicationService)
    private readonly service: ProviderApplicationService,
    @Inject(TRUSTED_TENANT_CONTEXT_RESOLVER)
    private readonly tenantContext: TrustedTenantContextResolver,
  ) {}

  @Get()
  @Roles("admin")
  @ApiOperation({ summary: "Listar los providers autorizados del tenant de confianza" })
  @ApiQuery({ type: ProvidersIndexQueryDocDto })
  @ApiValidationErrorResponse()
  @ZodResponse({ status: 200, type: ProvidersIndexResponseDocDto })
  async index(
    @Query(new ZodQueryPipe(providersIndexQueryDto)) query: ProvidersIndexQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProvidersIndexResponseDto> {
    const tenantContext = await this.tenantContext.resolve();

    return this.service.index(query, toProvidersIndexActor(request.user), tenantContext);
  }

  @Post()
  @Roles("admin")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Crear un provider atomico del tenant de confianza" })
  @ApiBody({ type: ProvidersStoreRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiConflictBusinessResponse(
    "Ya existe un proveedor con ese código dentro del tenant autorizado.",
  )
  @ZodResponse({ status: 201, type: ProvidersStoreResponseDocDto })
  async store(
    @Body(new ZodPipe(providersStoreRequestDto)) body: ProvidersStoreRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProvidersStoreResponseDto> {
    const tenantContext = await this.tenantContext.resolve();

    return this.service.store(body, toProvidersStoreActor(request.user), tenantContext);
  }

  @Post(":providerId/disable")
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Deshabilitar un provider del tenant de confianza (sin eliminar historial)",
  })
  @ApiParam({ format: "uuid", name: "providerId", type: String })
  @ApiBody({ type: DisableProviderRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Provider")
  @ApiConflictBusinessResponse(
    "La versión esperada ya no es la vigente o el estado actual no permite deshabilitar.",
  )
  @ZodResponse({ status: 200, type: DisableProviderResponseDocDto })
  async disable(
    @Param(new ZodPipe(disableProviderParamsDto)) params: DisableProviderParamsDto,
    @Body(new ZodPipe(disableProviderRequestDto)) body: DisableProviderRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<DisableProviderResponseDto> {
    const tenantContext = await this.tenantContext.resolve();

    return this.service.disable(
      params,
      body,
      toDisableProviderActor(request.user),
      tenantContext,
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
