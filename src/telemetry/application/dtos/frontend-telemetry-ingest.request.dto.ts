import type { z } from "zod";
import { frontendTelemetrySchema } from "../schemas/frontend-telemetry.schema";

export const frontendTelemetryIngestRequestDto = frontendTelemetrySchema;

export type FrontendTelemetryIngestRequestDto = z.infer<typeof frontendTelemetryIngestRequestDto>;
