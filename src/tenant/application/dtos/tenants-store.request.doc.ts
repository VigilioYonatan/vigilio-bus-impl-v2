import { createZodDto } from "nestjs-zod";
import { tenantsStoreRequestDto } from "./tenants-store.request.dto";

export class TenantsStoreRequestDocDto extends createZodDto(tenantsStoreRequestDto) {}
