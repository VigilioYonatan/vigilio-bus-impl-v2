import { z } from "zod";

export function createPaginatorSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    count: z.number().int().min(0),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(itemSchema),
  });
}

export type PaginatorSchema<T extends z.ZodTypeAny> = ReturnType<typeof createPaginatorSchema<T>>;
