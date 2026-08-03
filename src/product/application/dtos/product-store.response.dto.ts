import type { z } from "zod";
import { productShowResponseDto } from "./product-show.response.dto";

export const productStoreResponseDto = productShowResponseDto;

export type ProductStoreResponseDto = z.infer<typeof productStoreResponseDto>;
