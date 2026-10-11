import { createZodDto } from "nestjs-zod";
import { auditShowResponseDto } from "./audit-show.response.dto";

export class AuditShowResponseDocDto extends createZodDto(auditShowResponseDto) {}
