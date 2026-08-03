import { createZodDto } from "nestjs-zod";
import { frontendTelemetryIngestResponseDto } from "./frontend-telemetry-ingest.response.dto";

export class FrontendTelemetryIngestResponseDocDto extends createZodDto(
  frontendTelemetryIngestResponseDto,
) {}
