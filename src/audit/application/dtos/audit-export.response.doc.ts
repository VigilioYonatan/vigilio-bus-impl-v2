import { createZodDto } from "nestjs-zod";
import { auditExportResponseDto } from "./audit-export.response.dto";

export class AuditExportResponseDocDto extends createZodDto(auditExportResponseDto) {}
