import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import {
  HealthResponseDocDto,
  ReadinessResponseDocDto,
} from "@/health/application/dtos/health.response.doc";
import type {
  HealthResponseDto,
  ReadinessResponseDto,
} from "@/health/application/dtos/health.response.dto";
import { HealthApplicationService } from "@/health/application/service/health.application-service";
import { Public } from "@/shared/infrastructure/security/public.decorator";

@ApiTags("health")
@Public()
@Controller()
export class HealthController {
  constructor(
    @Inject(HealthApplicationService)
    private readonly service: HealthApplicationService,
  ) {}

  @Get("health")
  @ApiOperation({ summary: "Verificar que el proceso esta vivo" })
  @ZodResponse({ status: 200, type: HealthResponseDocDto })
  health(): HealthResponseDto {
    return this.service.health();
  }

  @Get("health/live")
  @ApiOperation({ summary: "Verificar que el proceso esta vivo (liveness)" })
  @ZodResponse({ status: 200, type: HealthResponseDocDto })
  healthLive(): HealthResponseDto {
    return this.service.health();
  }

  @Get("health/startup")
  @ApiOperation({ summary: "Verificar que el proceso ha iniciado (startup)" })
  @ZodResponse({ status: 200, type: HealthResponseDocDto })
  healthStartup(): HealthResponseDto {
    return this.service.health();
  }

  @Get("ready")
  @ApiOperation({ summary: "Verificar que la API y PostgreSQL estan listos" })
  @ApiServiceUnavailableResponse({ description: "PostgreSQL no esta disponible." })
  @ZodResponse({ status: 200, type: ReadinessResponseDocDto })
  ready(): Promise<ReadinessResponseDto> {
    return this.service.readiness();
  }

  @Get("health/ready")
  @ApiOperation({ summary: "Verificar que la API y PostgreSQL estan listos (readiness)" })
  @ApiServiceUnavailableResponse({ description: "PostgreSQL no esta disponible." })
  @ZodResponse({ status: 200, type: ReadinessResponseDocDto })
  readiness(): Promise<ReadinessResponseDto> {
    return this.service.readiness();
  }
}
