import { z } from "zod";
import { productSchema } from "../schemas/product.schema";

export const productShowResponseDto = z.object({
  success: z.literal(true),
  product: productSchema,
});

export type ProductShowResponseDto = z.infer<typeof productShowResponseDto>;
