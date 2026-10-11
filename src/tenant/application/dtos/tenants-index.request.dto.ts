import type { z } from "zod";
import { tenantsIndexQuerySchema } from "../schemas/tenants-index.schema";

export const tenantsIndexQueryDto = tenantsIndexQuerySchema;

export type TenantsIndexQueryDto = z.infer<typeof tenantsIndexQueryDto>;
