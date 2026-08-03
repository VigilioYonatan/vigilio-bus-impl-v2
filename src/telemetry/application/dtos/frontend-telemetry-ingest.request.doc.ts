import { createZodDto } from "nestjs-zod";
import {
  frontendHttpOperationTelemetrySchema,
  frontendRuntimeErrorTelemetrySchema,
  frontendWebVitalTelemetrySchema,
} from "../schemas/frontend-telemetry.schema";

export class FrontendWebVitalTelemetryDocDto extends createZodDto(
  frontendWebVitalTelemetrySchema,
) {}

export class FrontendRuntimeErrorTelemetryDocDto extends createZodDto(
  frontendRuntimeErrorTelemetrySchema,
) {}

export class FrontendHttpOperationTelemetryDocDto extends createZodDto(
  frontendHttpOperationTelemetrySchema,
) {}
