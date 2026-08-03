import { createZodDto } from "nestjs-zod";
import { productIndexQueryDto } from "./product-index.request.dto";

export class ProductIndexQueryDocDto extends createZodDto(productIndexQueryDto) {}
