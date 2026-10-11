import type { z } from "zod";
import { providersIndexQuerySchema } from "../schemas/providers-index.schema";

/**
 * Query del listado `GET /providers` (`EP-PROVIDER-PROVIDERS-INDEX-001`).
 *
 * Contrato puro (Zod + tipo inferido, sin imports NestJS): la superficie
 * aceptada es `page`, `page_size`, `sort`, `search` y `status`; ningun campo
 * no declarado actua como alias de `tenant_id` y el tenant de confianza viaja
 * como argumento separado del puerto, nunca desde la request.
 */
export const providersIndexQueryDto = providersIndexQuerySchema;

export type ProvidersIndexQueryDto = z.infer<typeof providersIndexQueryDto>;
