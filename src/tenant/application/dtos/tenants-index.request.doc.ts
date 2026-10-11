import { createZodDto } from "nestjs-zod";
import { tenantsIndexQueryDto } from "./tenants-index.request.dto";

export class TenantsIndexQueryDocDto extends createZodDto(tenantsIndexQueryDto) {}
