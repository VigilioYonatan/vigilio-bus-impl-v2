import { createZodDto } from "nestjs-zod";
import { auditIndexQueryDto } from "./audit-index.request.dto";

export class AuditIndexQueryDocDto extends createZodDto(auditIndexQueryDto) {}
