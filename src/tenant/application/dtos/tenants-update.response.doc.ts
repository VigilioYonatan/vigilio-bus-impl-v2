import { createZodDto } from "nestjs-zod";
import { tenantsUpdateResponseDto } from "./tenants-update.response.dto";

export class TenantsUpdateResponseDocDto extends createZodDto(tenantsUpdateResponseDto) {}
