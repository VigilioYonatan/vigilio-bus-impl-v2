import { createZodDto } from "nestjs-zod";
import { tenantsStoreResponseDto } from "./tenants-store.response.dto";

export class TenantsStoreResponseDocDto extends createZodDto(tenantsStoreResponseDto) {}
