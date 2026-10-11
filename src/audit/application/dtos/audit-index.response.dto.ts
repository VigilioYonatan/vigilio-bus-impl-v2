import type { z } from "zod";
import { createPaginatorSchema } from "@/shared/application/schemas/paginator.schema";
import { auditEventSchema } from "../schemas/audit-event.schema";

export const auditIndexResponseDto = createPaginatorSchema(auditEventSchema);

export type AuditIndexResponseDto = z.infer<typeof auditIndexResponseDto>;
