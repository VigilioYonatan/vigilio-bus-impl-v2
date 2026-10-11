import { createZodDto } from "nestjs-zod";
import { tenantsUpdateRequestDto } from "./tenants-update.request.dto";

export class TenantsUpdateRequestDocDto extends createZodDto(tenantsUpdateRequestDto) {}
