import { createZodDto } from "nestjs-zod";
import { tenantsIndexResponseDto } from "./tenants-index.response.dto";

export class TenantsIndexResponseDocDto extends createZodDto(tenantsIndexResponseDto) {}
