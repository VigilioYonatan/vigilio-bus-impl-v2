import { createZodDto } from "nestjs-zod";
import { productShowResponseDto } from "./product-show.response.dto";

export class ProductShowResponseDocDto extends createZodDto(productShowResponseDto) {}
