import { createZodDto } from "nestjs-zod";
import { tenantsShowParamsDto } from "./tenants-show.request.dto";

export class TenantsShowParamsDocDto extends createZodDto(tenantsShowParamsDto) {}
