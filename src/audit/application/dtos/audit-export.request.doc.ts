import { createZodDto } from "nestjs-zod";
import { auditExportRequestDto } from "./audit-export.request.dto";

export class AuditExportRequestDocDto extends createZodDto(auditExportRequestDto) {}
