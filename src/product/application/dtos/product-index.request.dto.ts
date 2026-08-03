import type { z } from "zod";
import { querySchema } from "@/shared/application/schemas/query.schema";
import { productSchema } from "../schemas/product.schema";

export const productIndexQueryDto = productSchema
  .pick({
    sku: true,
    status: true,
  })
  .partial()
  .extend(querySchema.shape);

export type ProductIndexQueryDto = z.infer<typeof productIndexQueryDto>;
