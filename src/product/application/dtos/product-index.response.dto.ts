import type { z } from "zod";
import { createPaginatorSchema } from "@/shared/application/schemas/paginator.schema";
import { productSchema } from "../schemas/product.schema";

export const productIndexResponseDto = createPaginatorSchema(productSchema);

export type ProductIndexResponseDto = z.infer<typeof productIndexResponseDto>;
