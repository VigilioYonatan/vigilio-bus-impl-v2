import { z } from "zod";

export const timestampSchema = z.object({
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type TimestampSchema = z.infer<typeof timestampSchema>;
