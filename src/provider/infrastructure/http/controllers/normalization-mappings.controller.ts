import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { NormalizationMappingsStoreRequestDocDto } from "@/provider/application/dtos/normalization-mappings-store.request.doc";
import {
  type NormalizationMappingsStoreRequestDto,
  normalizationMappingsStoreRequestDto,
} from "@/provider/application/dtos/normalization-mappings-store.request.dto";
import { NormalizationMappingsStoreResponseDocDto } from "@/provider/application/dtos/normalization-mappings-store.response.doc";
import type { NormalizationMappingsStoreResponseDto } from "@/provider/application/dtos/normalization-mappings-store.response.dto";
import { toNormalizationMappingsStoreActor } from "@/provider/application/security/normalization-mappings-store-capability";
import type { TrustedTenantContextResolver } from "@/provider/application/security/trusted-tenant-context";
import { TRUSTED_TENANT_CONTEXT_RESOLVER } from "@/provider/application/security/trusted-tenant-context.token";
import { ProviderApplicationService } from "@/provider/application/service/provider.application-service";
import {
  ApiAuthRequiredResponse,
  ApiConflictBusinessResponse,
  ApiForbiddenBusinessResponse,
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { CORRELATION_ID_HEADER } from "@/shared/infrastructure/http/middleware/correlation-id.middleware";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import type { AuthenticatedRequest } from "@/shared/infrastructure/security/authenticated-request";
import { Roles } from "@/shared/infrastructure/security/roles.decorator";

/**
 * `POST /normalization-mappings`
 * (`EP-PROVIDER-NORMALIZATION-MAPPINGS-STORE-001`).
 *
 * El controller es solo transporte: guards/contexto, validacion del body con
 * el contrato compartido, resolucion del tenant de confianza (NUNCA desde la
 * request) y una unica invocacion al service. No existe una operacion legacy
 * `/normalization-mappings` (sin colision de ruta); el registro de este modulo
 * en `src/app.module.ts` permanece fuera de `allowed_paths` (S1) y la operacion
 * no esta activada (persistencia fail-closed: D2/D3/S2/S6).
 */
@ApiTags("provider")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiForbiddenBusinessResponse()
@ApiUnexpectedErrorResponse()
@Roles("admin")
@Controller("normalization-mappings")
export class NormalizationMappingsController {
  constructor(
    @Inject(ProviderApplicationService)
    private readonly service: ProviderApplicationService,
    @Inject(TRUSTED_TENANT_CONTEXT_RESOLVER)
    private readonly tenantContext: TrustedTenantContextResolver,
  ) {}

  @Post()
  @Roles("admin")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Crear un mapeo de normalizacion atomico del tenant de confianza",
  })
  @ApiBody({ type: NormalizationMappingsStoreRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiConflictBusinessResponse(
    "Ya existe un mapeo de normalizacion para ese par de origen dentro del tenant autorizado.",
  )
  @ZodResponse({ status: 201, type: NormalizationMappingsStoreResponseDocDto })
  async store(
    @Body(new ZodPipe(normalizationMappingsStoreRequestDto))
    body: NormalizationMappingsStoreRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<NormalizationMappingsStoreResponseDto> {
    const tenantContext = await this.tenantContext.resolve();

    return this.service.storeNormalizationMapping(
      body,
      toNormalizationMappingsStoreActor(request.user),
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
