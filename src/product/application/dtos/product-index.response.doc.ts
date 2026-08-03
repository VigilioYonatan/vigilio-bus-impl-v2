import { createZodDto } from "nestjs-zod";
import { productIndexResponseDto } from "./product-index.response.dto";

export class ProductIndexResponseDocDto extends createZodDto(productIndexResponseDto) {}
