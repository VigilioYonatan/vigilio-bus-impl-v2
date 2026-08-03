import { z } from "zod";

export const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
  sort_by: z.string().default("created_at"),
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
});

export type QuerySchema = z.infer<typeof querySchema>;
