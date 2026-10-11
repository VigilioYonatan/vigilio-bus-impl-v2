import type { z } from "zod";
import { createPaginatorSchema } from "@/shared/application/schemas/paginator.schema";
import { tenantSchema } from "../schemas/tenant.schema";

export const tenantsIndexResponseDto = createPaginatorSchema(tenantSchema);

export type TenantsIndexResponseDto = z.infer<typeof tenantsIndexResponseDto>;
