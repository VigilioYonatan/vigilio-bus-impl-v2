import type { z } from "zod";
import { productShowParamsDto } from "./product-show.request.dto";

export const productDestroyParamsDto = productShowParamsDto;

export type ProductDestroyParamsDto = z.infer<typeof productDestroyParamsDto>;
