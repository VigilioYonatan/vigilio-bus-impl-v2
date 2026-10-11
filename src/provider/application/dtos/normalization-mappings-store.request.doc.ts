import { createZodDto } from "nestjs-zod";
import { normalizationMappingsStoreRequestDto } from "./normalization-mappings-store.request.dto";

export class NormalizationMappingsStoreRequestDocDto extends createZodDto(
  normalizationMappingsStoreRequestDto,
) {}
