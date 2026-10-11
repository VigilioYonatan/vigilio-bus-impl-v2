import { createZodDto } from "nestjs-zod";
import { providersStoreResponseDto } from "./providers-store.response.dto";

export class ProvidersStoreResponseDocDto extends createZodDto(providersStoreResponseDto) {}
