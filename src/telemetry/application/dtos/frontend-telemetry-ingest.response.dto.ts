import { z } from "zod";

export const frontendTelemetryIngestResponseDto = z.object({
  accepted: z.literal(true),
  success: z.literal(true),
});

export type FrontendTelemetryIngestResponseDto = z.infer<typeof frontendTelemetryIngestResponseDto>;
