import { createZodDto } from "nestjs-zod";
import { productStoreRequestDto } from "./product-store.request.dto";

export class ProductStoreRequestDocDto extends createZodDto(productStoreRequestDto) {}
