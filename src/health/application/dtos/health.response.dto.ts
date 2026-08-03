import { z } from "zod";

export const healthResponseDto = z.object({
  status: z.literal("ok"),
});

export type HealthResponseDto = z.infer<typeof healthResponseDto>;
export const readinessResponseDto = z.object({
  status: z.literal("ready"),
});

export type ReadinessResponseDto = z.infer<typeof readinessResponseDto>;
