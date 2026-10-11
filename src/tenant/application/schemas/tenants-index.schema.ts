import { z } from "zod";
import { tenantStatusValues } from "./tenant.schema";

/**
 * Ordenes estables aceptados por `GET /tenants`.
 *
 * El orden total siempre se completa con el tie-breaker `id` en la misma
 * direccion, para que la paginacion offset sea determinista ante empates de
 * `created_at` (las claves de paginacion deben ser estables entre paginas).
 * El indice declarado en el schema Drizzle (`(created_at, id)`) soporta ambos
 * sentidos sin indices especulativos adicionales.
 */
export const tenantsIndexSortValues = ["created_at_desc", "created_at_asc"] as const;

/**
 * Filtros y paginacion del listado global `GET /tenants`.
 *
 * Los valores llegan como strings de query; `page`/`page_size` se coercionan
 * una sola vez en el boundary y se acotan al rango aprobado. `search` busca
 * solo en los campos aprobados (`slug`/`name`) y `status` filtra por el enum
 * del ciclo de vida.
 */
export const tenantsIndexQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(160).optional(),
  sort: z.enum(tenantsIndexSortValues).default("created_at_desc"),
  status: z.enum(tenantStatusValues).optional(),
});

export type TenantsIndexQuerySchema = z.infer<typeof tenantsIndexQuerySchema>;
export type TenantsIndexSort = (typeof tenantsIndexSortValues)[number];
