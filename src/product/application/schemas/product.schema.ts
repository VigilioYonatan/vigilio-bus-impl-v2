import { z } from "zod";
import { timestampSchema } from "@/shared/application/schemas/timestamp.schema";

export const productSchema = z.object({
  id: z.number().int().positive(),
  sku: z.string().trim().min(2).max(40),
  nombre: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(500).nullable(),
  precio: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
  stock: z.number().int().min(0),
  status: z.enum(["active", "inactive", "archived"]),
  ...timestampSchema.shape,
});

export type ProductSchema = z.infer<typeof productSchema>;
