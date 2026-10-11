import type { z } from "zod";
import { createPaginatorSchema } from "@/shared/application/schemas/paginator.schema";
import { providerSchema } from "../schemas/provider.schema";

/**
 * Envelope de exito de `GET /providers`.
 *
 * Reutiliza el paginador compartido (`createPaginatorSchema`) con la
 * proyeccion publica del agregado `provider` como item: `count` es el total
 * autorizado de la superficie tenant-scoped, `next`/`previous` son enlaces de
 * paginacion (string|null) y `results` jamas transporta columnas internas ni
 * material secreto.
 */
export const providersIndexResponseDto = createPaginatorSchema(providerSchema);

export type ProvidersIndexResponseDto = z.infer<typeof providersIndexResponseDto>;
