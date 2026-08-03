import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponseDocDto } from "@/shared/application/dtos/api-error.response.doc";
import {
  ApiAuthRequiredResponse,
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import type { AuthenticatedRequest } from "@/shared/infrastructure/security/authenticated-request";
import { UploadCreatePresignedUrlRequestDocDto } from "@/upload/application/dtos/upload-create-presigned-url.request.doc";
import {
  type UploadCreatePresignedUrlRequestDto,
  uploadCreatePresignedUrlRequestDto,
} from "@/upload/application/dtos/upload-create-presigned-url.request.dto";
import { UploadCreatePresignedUrlResponseDocDto } from "@/upload/application/dtos/upload-create-presigned-url.response.doc";
import type { UploadCreatePresignedUrlResponseDto } from "@/upload/application/dtos/upload-create-presigned-url.response.dto";
import { UploadApplicationService } from "@/upload/application/service/upload.application-service";

@ApiTags("uploads")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiUnexpectedErrorResponse()
@Controller("uploads")
export class UploadController {
  constructor(
    @Inject(UploadApplicationService)
    private readonly service: UploadApplicationService,
  ) {}

  @Post("presigned-url")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Crear URL presignada para subir archivos directo a S3",
  })
  @ApiBody({ type: UploadCreatePresignedUrlRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiServiceUnavailableResponse({
    description: "No se pudo generar la URL presignada de S3.",
    type: ApiErrorResponseDocDto,
  })
  @ZodResponse({ status: 201, type: UploadCreatePresignedUrlResponseDocDto })
  store(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodPipe(uploadCreatePresignedUrlRequestDto))
    body: UploadCreatePresignedUrlRequestDto,
  ): Promise<UploadCreatePresignedUrlResponseDto> {
    if (request.user === undefined) {
      throw new UnauthorizedException("Bearer token requerido, invalido o expirado.");
    }

    return this.service.createPresignedUrl(request.user.id, body);
  }
}
