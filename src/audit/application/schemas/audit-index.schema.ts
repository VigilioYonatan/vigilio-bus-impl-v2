import { z } from "zod";

/**
 * Ordenes estables aceptados por el listado.
 *
 * El orden total siempre se completa con el tie-breaker `id` dentro de la
 * misma direccion, para que la paginacion sea determinista ante empates de
 * `occurred_at` (las claves de paginacion deben ser estables entre paginas).
 */
export const auditIndexSortValues = ["occurred_at_desc", "occurred_at_asc"] as const;

/**
 * Filtros y paginacion del listado `GET /audit-events`.
 *
 * Los valores llegan como strings de query; `page`/`page_size` se coercionan
 * una sola vez en el boundary. `from`/`to` filtran por `occurred_at` y aceptan
 * ISO 8601 con o sin offset.
 */
export const auditIndexQuerySchema = z.object({
  action: z.string().trim().min(1).max(120).optional(),
  actor_id: z.string().trim().min(1).max(160).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(160).optional(),
  sort: z.enum(auditIndexSortValues).default("occurred_at_desc"),
  to: z.iso.datetime({ offset: true }).optional(),
});

export type AuditIndexQuerySchema = z.infer<typeof auditIndexQuerySchema>;
export type AuditIndexSort = (typeof auditIndexSortValues)[number];
