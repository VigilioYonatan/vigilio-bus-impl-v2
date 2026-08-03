import { createZodDto } from "nestjs-zod";
import { productStoreResponseDto } from "./product-store.response.dto";

export class ProductStoreResponseDocDto extends createZodDto(productStoreResponseDto) {}
