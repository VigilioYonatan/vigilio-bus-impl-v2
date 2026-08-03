import { z } from "zod";

export const userDestroyResponseDto = z.object({
  success: z.literal(true),
  message: z.string(),
});

export type UserDestroyResponseDto = z.infer<typeof userDestroyResponseDto>;
