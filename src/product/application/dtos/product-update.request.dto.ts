import type { z } from "zod";
import { productSchema } from "../schemas/product.schema";
import { productShowParamsDto } from "./product-show.request.dto";

export const productUpdateParamsDto = productShowParamsDto;

export const productUpdateRequestDto = productSchema
  .pick({
    sku: true,
    nombre: true,
    descripcion: true,
    precio: true,
    stock: true,
    status: true,
  })
  .partial();

export type ProductUpdateParamsDto = z.infer<typeof productUpdateParamsDto>;
export type ProductUpdateRequestDto = z.infer<typeof productUpdateRequestDto>;
