import { createZodDto } from "nestjs-zod";
import { healthResponseDto, readinessResponseDto } from "./health.response.dto";

export class HealthResponseDocDto extends createZodDto(healthResponseDto) {}
export class ReadinessResponseDocDto extends createZodDto(readinessResponseDto) {}
