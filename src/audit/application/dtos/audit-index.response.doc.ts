import { createZodDto } from "nestjs-zod";
import { auditIndexResponseDto } from "./audit-index.response.dto";

export class AuditIndexResponseDocDto extends createZodDto(auditIndexResponseDto) {}
