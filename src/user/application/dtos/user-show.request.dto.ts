import { z } from "zod";

export const userShowParamsDto = z.object({
  id: z.coerce.number().int().positive(),
});

export type UserShowParamsDto = z.infer<typeof userShowParamsDto>;
