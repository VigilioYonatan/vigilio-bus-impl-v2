import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
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
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import { ZodQueryPipe } from "@/shared/infrastructure/http/pipes/zod-query.pipe";
import { Roles } from "@/shared/infrastructure/security/roles.decorator";
import {
  type UserDestroyParamsDto,
  userDestroyParamsDto,
} from "@/user/application/dtos/user-destroy.request.dto";
import { UserDestroyResponseDocDto } from "@/user/application/dtos/user-destroy.response.doc";
import type { UserDestroyResponseDto } from "@/user/application/dtos/user-destroy.response.dto";
import { UserIndexQueryDocDto } from "@/user/application/dtos/user-index.request.doc";
import {
  type UserIndexQueryDto,
  userIndexQueryDto,
} from "@/user/application/dtos/user-index.request.dto";
import { UserIndexResponseDocDto } from "@/user/application/dtos/user-index.response.doc";
import type { UserIndexResponseDto } from "@/user/application/dtos/user-index.response.dto";
import {
  type UserShowParamsDto,
  userShowParamsDto,
} from "@/user/application/dtos/user-show.request.dto";
import { UserShowResponseDocDto } from "@/user/application/dtos/user-show.response.doc";
import type { UserShowResponseDto } from "@/user/application/dtos/user-show.response.dto";
import { UserStoreRequestDocDto } from "@/user/application/dtos/user-store.request.doc";
import {
  type UserStoreRequestDto,
  userStoreRequestDto,
} from "@/user/application/dtos/user-store.request.dto";
import { UserStoreResponseDocDto } from "@/user/application/dtos/user-store.response.doc";
import type { UserStoreResponseDto } from "@/user/application/dtos/user-store.response.dto";
import { UserUpdateRequestDocDto } from "@/user/application/dtos/user-update.request.doc";
import {
  type UserUpdateParamsDto,
  type UserUpdateRequestDto,
  userUpdateParamsDto,
  userUpdateRequestDto,
} from "@/user/application/dtos/user-update.request.dto";
import { UserUpdateResponseDocDto } from "@/user/application/dtos/user-update.response.doc";
import type { UserUpdateResponseDto } from "@/user/application/dtos/user-update.response.dto";
import { UserApplicationService } from "@/user/application/service/user.application-service";

@ApiTags("users")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiForbiddenBusinessResponse()
@ApiUnexpectedErrorResponse()
@Roles("admin")
@Controller("users")
export class UserController {
  constructor(
    @Inject(UserApplicationService)
    private readonly service: UserApplicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Indexar usuarios" })
  @ApiQuery({ type: UserIndexQueryDocDto })
  @ApiValidationErrorResponse()
  @ZodResponse({ status: 200, type: UserIndexResponseDocDto })
  index(
    @Query(new ZodQueryPipe(userIndexQueryDto)) query: UserIndexQueryDto,
  ): Promise<UserIndexResponseDto> {
    return this.service.index(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Mostrar usuario" })
  @ApiParam({ name: "id", type: Number })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Usuario")
  @ZodResponse({ status: 200, type: UserShowResponseDocDto })
  show(
    @Param(new ZodPipe(userShowParamsDto)) params: UserShowParamsDto,
  ): Promise<UserShowResponseDto> {
    return this.service.show(params.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Crear usuario" })
  @ApiBody({ type: UserStoreRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiConflictBusinessResponse("El email ya esta registrado.")
  @ZodResponse({ status: 201, type: UserStoreResponseDocDto })
  store(
    @Body(new ZodPipe(userStoreRequestDto)) body: UserStoreRequestDto,
  ): Promise<UserStoreResponseDto> {
    return this.service.store(body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar usuario" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UserUpdateRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Usuario")
  @ApiConflictBusinessResponse("El email ya esta registrado.")
  @ZodResponse({ status: 200, type: UserUpdateResponseDocDto })
  update(
    @Param(new ZodPipe(userUpdateParamsDto)) params: UserUpdateParamsDto,
    @Body(new ZodPipe(userUpdateRequestDto)) body: UserUpdateRequestDto,
  ): Promise<UserUpdateResponseDto> {
    return this.service.update(params.id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Eliminar usuario" })
  @ApiParam({ name: "id", type: Number })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Usuario")
  @ZodResponse({ status: 200, type: UserDestroyResponseDocDto })
  destroy(
    @Param(new ZodPipe(userDestroyParamsDto)) params: UserDestroyParamsDto,
  ): Promise<UserDestroyResponseDto> {
    return this.service.destroy(params.id);
  }
}
