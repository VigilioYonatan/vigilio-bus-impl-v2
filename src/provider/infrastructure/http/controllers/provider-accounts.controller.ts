import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { ProviderAccountsStoreRequestDocDto } from "@/provider/application/dtos/provider-accounts-store.request.doc";
import {
  type ProviderAccountsStoreRequestDto,
  providerAccountsStoreRequestDto,
} from "@/provider/application/dtos/provider-accounts-store.request.dto";
import { ProviderAccountsStoreResponseDocDto } from "@/provider/application/dtos/provider-accounts-store.response.doc";
import type { ProviderAccountsStoreResponseDto } from "@/provider/application/dtos/provider-accounts-store.response.dto";
import { toProviderAccountsStoreActor } from "@/provider/application/security/provider-accounts-store-capability";
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
 * `POST /provider-accounts`
 * (`EP-PROVIDER-PROVIDER-ACCOUNTS-STORE-001`).
 *
 * El controller es solo transporte: guards/contexto, validacion del body con
 * el contrato compartido, resolucion del tenant de confianza (NUNCA desde la
 * request) y una unica invocacion al service. No existe una operacion legacy
 * `/provider-accounts` (sin colision de ruta); el registro de este modulo en
 * `src/app.module.ts` permanece fuera de `allowed_paths` (S1) y la operacion
 * no esta activada (persistencia fail-closed: D4/D5/D6/S2/S6). El contrato
 * aceptado no declara 404 para esta operacion: un `provider_id` ajeno o
 * inexistente se rechaza de forma no reveladora (403).
 */
@ApiTags("provider")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiForbiddenBusinessResponse()
@ApiUnexpectedErrorResponse()
@Roles("admin")
@Controller("provider-accounts")
export class ProviderAccountsController {
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
    summary: "Crear una cuenta de proveedor atomica del tenant de confianza",
  })
  @ApiBody({ type: ProviderAccountsStoreRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiConflictBusinessResponse(
    "Ya existe una cuenta de proveedor con esa identidad dentro del tenant autorizado.",
  )
  @ZodResponse({ status: 201, type: ProviderAccountsStoreResponseDocDto })
  async store(
    @Body(new ZodPipe(providerAccountsStoreRequestDto))
    body: ProviderAccountsStoreRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProviderAccountsStoreResponseDto> {
    const tenantContext = await this.tenantContext.resolve();

    return this.service.storeProviderAccount(
      body,
      toProviderAccountsStoreActor(request.user),
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
