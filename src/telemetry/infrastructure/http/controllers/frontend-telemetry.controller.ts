import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from "@nestjs/common";
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  getSchemaPath,
} from "@nestjs/swagger";
import type { Request } from "express";
import { ZodResponse } from "nestjs-zod";
import {
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { CORRELATION_ID_HEADER } from "@/shared/infrastructure/http/middleware/correlation-id.middleware";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import { Public } from "@/shared/infrastructure/security/public.decorator";
import {
  FrontendHttpOperationTelemetryDocDto,
  FrontendRuntimeErrorTelemetryDocDto,
  FrontendWebVitalTelemetryDocDto,
} from "@/telemetry/application/dtos/frontend-telemetry-ingest.request.doc";
import {
  type FrontendTelemetryIngestRequestDto,
  frontendTelemetryIngestRequestDto,
} from "@/telemetry/application/dtos/frontend-telemetry-ingest.request.dto";
import { FrontendTelemetryIngestResponseDocDto } from "@/telemetry/application/dtos/frontend-telemetry-ingest.response.doc";
import type { FrontendTelemetryIngestResponseDto } from "@/telemetry/application/dtos/frontend-telemetry-ingest.response.dto";
import { FrontendTelemetryApplicationService } from "@/telemetry/application/service/frontend-telemetry.application-service";

@ApiTags("telemetry")
@ApiExtraModels(
  FrontendWebVitalTelemetryDocDto,
  FrontendRuntimeErrorTelemetryDocDto,
  FrontendHttpOperationTelemetryDocDto,
)
@Public()
@ApiUnexpectedErrorResponse()
@Controller("telemetry")
export class FrontendTelemetryController {
  constructor(
    @Inject(FrontendTelemetryApplicationService)
    private readonly service: FrontendTelemetryApplicationService,
  ) {}

  @Post("frontend")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Recibir telemetria operacional acotada del frontend" })
  @ApiBody({
    schema: {
      discriminator: { propertyName: "event_type" },
      oneOf: [
        { $ref: getSchemaPath(FrontendWebVitalTelemetryDocDto) },
        { $ref: getSchemaPath(FrontendRuntimeErrorTelemetryDocDto) },
        { $ref: getSchemaPath(FrontendHttpOperationTelemetryDocDto) },
      ],
    },
  })
  @ApiValidationErrorResponse()
  @ApiTooManyRequestsResponse({ description: "Limite de telemetria excedido." })
  @ZodResponse({ status: 202, type: FrontendTelemetryIngestResponseDocDto })
  ingest(
    @Body(new ZodPipe(frontendTelemetryIngestRequestDto))
    body: FrontendTelemetryIngestRequestDto,
    @Req() request: Request,
  ): FrontendTelemetryIngestResponseDto {
    const requestCorrelationId =
      request.header(CORRELATION_ID_HEADER) ?? body.correlation_id ?? "missing";
    return this.service.ingest(body, { request_correlation_id: requestCorrelationId });
  }
}
