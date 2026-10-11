import { createZodDto } from "nestjs-zod";
import { normalizationMappingsStoreResponseDto } from "./normalization-mappings-store.response.dto";

export class NormalizationMappingsStoreResponseDocDto extends createZodDto(
  normalizationMappingsStoreResponseDto,
) {}
