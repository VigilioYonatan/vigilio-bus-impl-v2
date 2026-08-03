import { createZodDto } from "nestjs-zod";
import { productUpdateResponseDto } from "./product-update.response.dto";

export class ProductUpdateResponseDocDto extends createZodDto(productUpdateResponseDto) {}
