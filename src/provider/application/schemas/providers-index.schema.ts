import { z } from "zod";
import { providerStatusValues } from "./provider.schema";

/**
 * Ordenes estables aceptados por `GET /providers`.
 *
 * El orden total siempre se completa con el tie-breaker `id` en la misma
 * direccion, para que la paginacion offset sea determinista ante empates de
 * `created_at` (las claves de paginacion deben ser estables entre paginas).
 * El indice propuesto por la migracion versionada — `(tenant_id, created_at,
 * id)` — soporta ambos sentidos sin indices especulativos adicionales.
 */
export const providersIndexSortValues = ["created_at_desc", "created_at_asc"] as const;

/**
 * Filtros y paginacion del listado tenant-scoped `GET /providers`.
 *
 * Los valores llegan como strings de query; `page`/`page_size` se coercionan
 * una sola vez en el boundary y se acotan al rango aprobado. `search` busca
 * solo en los campos aprobados (`code`/`name`) y `status` filtra por el enum
 * del ciclo de vida. Ningun campo de esta superficie amplia el alcance ni
 * actua como alias de `tenant_id`: el tenant viaja como contexto de confianza
 * separado y jamas desde la request.
 *
 * Nota de convencion: la coercion de `page`/`page_size` vive en este schema
 * (precedente ejecutable de `tenants-index`); `ZodQueryPipe` solo normaliza
 * `limit`/`offset`, que no forman parte del contrato aceptado.
 */
export const providersIndexQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(160).optional(),
  sort: z.enum(providersIndexSortValues).default("created_at_desc"),
  status: z.enum(providerStatusValues).optional(),
});

export type ProvidersIndexQuerySchema = z.infer<typeof providersIndexQuerySchema>;
export type ProvidersIndexSort = (typeof providersIndexSortValues)[number];
