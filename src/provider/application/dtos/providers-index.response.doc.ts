import { createZodDto } from "nestjs-zod";
import { providersIndexResponseDto } from "./providers-index.response.dto";

export class ProvidersIndexResponseDocDto extends createZodDto(providersIndexResponseDto) {}
