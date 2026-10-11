import type { z } from "zod";
import { auditIndexQuerySchema } from "../schemas/audit-index.schema";

export const auditIndexQueryDto = auditIndexQuerySchema;

export type AuditIndexQueryDto = z.infer<typeof auditIndexQueryDto>;
