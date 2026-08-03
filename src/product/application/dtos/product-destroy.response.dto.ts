import { z } from "zod";

export const productDestroyResponseDto = z.object({
  success: z.literal(true),
  message: z.string(),
});

export type ProductDestroyResponseDto = z.infer<typeof productDestroyResponseDto>;
