import { createZodDto } from "nestjs-zod";
import { providersIndexQueryDto } from "./providers-index.request.dto";

export class ProvidersIndexQueryDocDto extends createZodDto(providersIndexQueryDto) {}
