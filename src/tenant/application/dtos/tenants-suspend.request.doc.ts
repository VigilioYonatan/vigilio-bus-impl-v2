import { createZodDto } from "nestjs-zod";
import { tenantsSuspendRequestDto } from "./tenants-suspend.request.dto";

export class TenantsSuspendRequestDocDto extends createZodDto(tenantsSuspendRequestDto) {}
