import { createZodDto } from "nestjs-zod";
import { productUpdateRequestDto } from "./product-update.request.dto";

export class ProductUpdateRequestDocDto extends createZodDto(productUpdateRequestDto) {}
