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
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import {
  type UsersShowParamsDto,
  usersShowParamsDto,
} from "@/identity/application/dtos/users-show.request.dto";
import { UsersShowResponseDocDto } from "@/identity/application/dtos/users-show.response.doc";
import type { UsersShowResponseDto } from "@/identity/application/dtos/users-show.response.dto";
import { UsersStoreRequestDocDto } from "@/identity/application/dtos/users-store.request.doc";
import {
  type UsersStoreRequestDto,
  usersStoreRequestDto,
} from "@/identity/application/dtos/users-store.request.dto";
import { UsersStoreResponseDocDto } from "@/identity/application/dtos/users-store.response.doc";
import type { UsersStoreResponseDto } from "@/identity/application/dtos/users-store.response.dto";
import { UsersUpdateRequestDocDto } from "@/identity/application/dtos/users-update.request.doc";
import {
  type UsersUpdateParamsDto,
  type UsersUpdateRequestDto,
  usersUpdateParamsDto,
  usersUpdateRequestDto,
} from "@/identity/application/dtos/users-update.request.dto";
import { UsersUpdateResponseDocDto } from "@/identity/application/dtos/users-update.response.doc";
import type { UsersUpdateResponseDto } from "@/identity/application/dtos/users-update.response.dto";
import type { TrustedTenantContextResolver } from "@/identity/application/security/trusted-tenant-context";
import { TRUSTED_TENANT_CONTEXT_RESOLVER } from "@/identity/application/security/trusted-tenant-context.token";
import { toUsersShowActor } from "@/identity/application/security/users-show-capability";
import { toUsersStoreActor } from "@/identity/application/security/users-store-capability";
import { toUsersUpdateActor } from "@/identity/application/security/users-update-capability";
import { IdentityApplicationService } from "@/identity/application/service/identity.application-service";
import {
  ApiAuthRequiredResponse,
  ApiConflictBusinessResponse,
  ApiForbiddenBusinessResponse,
  ApiResourceNotFoundResponse,
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import type { AuthenticatedRequest } from "@/shared/infrastructure/security/authenticated-request";
import { Roles } from "@/shared/infrastructure/security/roles.decorator";

/**
 * Rutas del agregado `user` del contexto `identity`: `GET /users/{userId}`
 * (`EP-IDENTITY-USERS-SHOW-001`, lectura tenant-scoped), `POST /users`
 * (`EP-IDENTITY-USERS-STORE-001`, alta del tenant de confianza) y
 * `PATCH /users/{userId}` (`EP-IDENTITY-USERS-UPDATE-001`, edicion de campos
 * mutables con concurrencia optimista).
 *
 * El controller es solo transporte: guards/contexto, validacion del
 * contrato compartido, resolucion del tenant de confianza (NUNCA desde la
 * request) y una unica invocacion al service. Las rutas colisionan con la
 * familia legacy `/users` (`UserModule`); el registro de este modulo en
 * `src/app.module.ts` permanece fuera de `allowed_paths` y bloqueado hasta
 * que D1 (coexistencia/retiro legacy) se confirme — ninguna operacion esta
 * activada.
 */
@ApiTags("identity")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiForbiddenBusinessResponse()
@ApiUnexpectedErrorResponse()
@Roles("admin")
@Controller("users")
export class UsersController {
  constructor(
    @Inject(IdentityApplicationService)
    private readonly service: IdentityApplicationService,
    @Inject(TRUSTED_TENANT_CONTEXT_RESOLVER)
    private readonly tenantContext: TrustedTenantContextResolver,
  ) {}

  @Get(":userId")
  @Roles("admin")
  @ApiOperation({ summary: "Obtener un usuario autorizado del tenant de confianza" })
  @ApiParam({ format: "uuid", name: "userId", type: String })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Usuario")
  @ZodResponse({ status: 200, type: UsersShowResponseDocDto })
  async show(
    @Param(new ZodPipe(usersShowParamsDto)) params: UsersShowParamsDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<UsersShowResponseDto> {
    const tenantContext = await this.tenantContext.resolve();

    return this.service.show(params, toUsersShowActor(request.user), tenantContext);
  }

  @Post()
  @Roles("admin")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Crear un usuario atomico del tenant de confianza" })
  @ApiBody({ type: UsersStoreRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiConflictBusinessResponse("Ya existe un usuario con ese email dentro del tenant autorizado.")
  @ZodResponse({ status: 201, type: UsersStoreResponseDocDto })
  async store(
    @Body(new ZodPipe(usersStoreRequestDto)) body: UsersStoreRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<UsersStoreResponseDto> {
    const tenantContext = await this.tenantContext.resolve();

    return this.service.store(body, toUsersStoreActor(request.user), tenantContext);
  }

  @Patch(":userId")
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Editar los campos mutables de un usuario del tenant de confianza" })
  @ApiParam({ format: "uuid", name: "userId", type: String })
  @ApiBody({ type: UsersUpdateRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Usuario")
  @ApiConflictBusinessResponse(
    "La version esperada ya no es la vigente; refresque el estado autoritativo y reintente sin sobrescribir.",
  )
  @ZodResponse({ status: 200, type: UsersUpdateResponseDocDto })
  async update(
    @Param(new ZodPipe(usersUpdateParamsDto)) params: UsersUpdateParamsDto,
    @Body(new ZodPipe(usersUpdateRequestDto)) body: UsersUpdateRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<UsersUpdateResponseDto> {
    const tenantContext = await this.tenantContext.resolve();

    return this.service.update(params, body, toUsersUpdateActor(request.user), tenantContext);
  }
}
