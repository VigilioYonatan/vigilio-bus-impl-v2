import type { z } from "zod";
import { auditExportRequestSchema } from "../schemas/audit-export.schema";

export const auditExportRequestDto = auditExportRequestSchema;

export type AuditExportRequestDto = z.infer<typeof auditExportRequestDto>;
