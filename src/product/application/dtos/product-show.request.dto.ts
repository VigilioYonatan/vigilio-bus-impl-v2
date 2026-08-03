import { z } from "zod";

export const productShowParamsDto = z.object({
  id: z.coerce.number().int().positive(),
});

export type ProductShowParamsDto = z.infer<typeof productShowParamsDto>;
