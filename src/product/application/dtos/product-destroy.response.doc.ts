import { createZodDto } from "nestjs-zod";
import { productDestroyResponseDto } from "./product-destroy.response.dto";

export class ProductDestroyResponseDocDto extends createZodDto(productDestroyResponseDto) {}
