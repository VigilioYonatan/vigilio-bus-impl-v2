import { createZodDto } from "nestjs-zod";
import { tenantsSuspendResponseDto } from "./tenants-suspend.response.dto";

export class TenantsSuspendResponseDocDto extends createZodDto(tenantsSuspendResponseDto) {}
