import type { z } from "zod";
import { productSchema } from "../schemas/product.schema";

export const productStoreRequestDto = productSchema.pick({
  sku: true,
  nombre: true,
  descripcion: true,
  precio: true,
  stock: true,
});

export type ProductStoreRequestDto = z.infer<typeof productStoreRequestDto>;
