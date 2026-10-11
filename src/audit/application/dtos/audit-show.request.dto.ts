import type { z } from "zod";
import { auditShowParamsSchema } from "../schemas/audit-show.schema";

export const auditShowParamsDto = auditShowParamsSchema;

export type AuditShowParamsDto = z.infer<typeof auditShowParamsDto>;
