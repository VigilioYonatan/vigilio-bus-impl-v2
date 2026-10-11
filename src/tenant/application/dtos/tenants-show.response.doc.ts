import { createZodDto } from "nestjs-zod";
import { tenantsShowResponseDto } from "./tenants-show.response.dto";

export class TenantsShowResponseDocDto extends createZodDto(tenantsShowResponseDto) {}
