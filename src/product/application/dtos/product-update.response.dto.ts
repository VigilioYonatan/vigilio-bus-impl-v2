import type { z } from "zod";
import { productShowResponseDto } from "./product-show.response.dto";

export const productUpdateResponseDto = productShowResponseDto;

export type ProductUpdateResponseDto = z.infer<typeof productUpdateResponseDto>;
