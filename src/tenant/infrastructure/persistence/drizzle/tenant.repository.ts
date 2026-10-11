import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";
import type { TenantsIndexQueryDto } from "@/tenant/application/dtos/tenants-index.request.dto";
import type { TenantsIndexResponseDto } from "@/tenant/application/dtos/tenants-index.response.dto";
import type { TenantsStoreRequestDto } from "@/tenant/application/dtos/tenants-store.request.dto";
import { TenantIdentityConflictError } from "@/tenant/application/errors/tenant-identity-conflict.error";
import type {
  ITenantRepository,
  TenantSuspendInput,
  TenantSuspendResult,
  TenantUpdateInput,
  TenantUpdateResult,
} from "@/tenant/application/repositories/tenant.repository.interface";
import type { TenantSchema } from "@/tenant/application/schemas/tenant.schema";
import { tenantTable } from "./schema";

/**
 * Columnas expuestas por la proyeccion publica del registro global.
 *
 * Se listan una a una para no acoplar el contrato HTTP a la forma completa de
 * la tabla ni filtrar columnas internas si el schema evoluciona.
 */
const tenantProjection = {
  created_at: tenantTable.created_at,
  id: tenantTable.id,
  name: tenantTable.name,
  slug: tenantTable.slug,
  status: tenantTable.status,
  suspension_reason: tenantTable.suspension_reason,
  updated_at: tenantTable.updated_at,
  version: tenantTable.version,
};

@Injectable()
export class TenantRepository implements ITenantRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  async index(query: TenantsIndexQueryDto): Promise<TenantsIndexResponseDto> {
    const filters = this.buildFilters(query);
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [totalRow] = await this.db.select({ total: count() }).from(tenantTable).where(where);
    const total = Number(totalRow?.total ?? 0);

    const order =
      query.sort === "created_at_asc"
        ? [asc(tenantTable.created_at), asc(tenantTable.id)]
        : [desc(tenantTable.created_at), desc(tenantTable.id)];

    const rows = await this.db
      .select(tenantProjection)
      .from(tenantTable)
      .where(where)
      .orderBy(...order)
      .limit(query.page_size)
      .offset((query.page - 1) * query.page_size);

    return {
      success: true,
      count: total,
      next: query.page * query.page_size < total ? this.pageLink(query, query.page + 1) : null,
      previous: query.page > 1 ? this.pageLink(query, query.page - 1) : null,
      results: rows.map((row) => this.toCommittedProjection(row)),
    };
  }

  /**
   * Lectura puntual autorizada del registro global por identidad inmutable.
   *
   * Proyeccion explicita y lookup por clave primaria (`id = :tenantId`): el
   * indice de la PK es la ruta de acceso justificada y no se agrega un indice
   * especulativo. La ausencia devuelve `null` — la clasificacion 404 no
   * reveladora pertenece al service — y ningun error crudo del driver forma
   * parte del resultado. No abre transaccion ni escribe estado/cache.
   */
  async show(tenantId: string): Promise<TenantSchema | null> {
    const [row] = await this.db
      .select(tenantProjection)
      .from(tenantTable)
      .where(eq(tenantTable.id, tenantId))
      .limit(1);

    return row ? this.toCommittedProjection(row) : null;
  }

  /**
   * Inserta el tenant con columnas explicitas (`slug`, `name`) y devuelve la
   * proyeccion publica confirmada; los defaults de base de datos aplican
   * `status = ACTIVE`, `version = 1`, `suspension_reason = NULL` y los
   * timestamps UTC. La identidad global `slug` no lleva pre-chequeo de
   * aplicacion: la violacion del constraint `tenants_slug_unique` es el guard
   * final ante carreras y se traduce aqui al conflicto canonico de identidad,
   * sin que ningun error del driver cruce esta frontera.
   */
  async store(input: TenantsStoreRequestDto): Promise<TenantSchema> {
    try {
      const [row] = await this.db
        .insert(tenantTable)
        .values({ name: input.name, slug: input.slug })
        .returning(tenantProjection);

      if (!row) {
        throw new Error("No se pudo persistir el tenant");
      }

      return this.toCommittedProjection(row);
    } catch (error) {
      if (isTenantSlugUniqueViolation(error)) {
        throw new TenantIdentityConflictError();
      }

      throw error;
    }
  }

  /**
   * Ejecuta la edicion de los campos mutables del registro como
   * compare-and-write (optimistic concurrency) dentro de una transaccion local
   * del adapter.
   *
   * El `WHERE` incluye identidad + `version = expected_version`: la base de
   * datos es el guard final de carreras (una version obsoleta jamas sobrescribe
   * una mas nueva; no hay last-write-wins ni lock en memoria). Una fila afectada
   * devuelve la proyeccion publica confirmada con `version` incrementada y
   * `updated_at` avanzado; cero filas se clasifica leyendo la fila dentro de la
   * misma transaccion — inexistente ⇒ `not_found`; existente ⇒ `stale`
   * (version desactualizada). `name` ausente conserva el nombre vigente y el
   * CAS se ejecuta igualmente (contrato aceptado; sin validacion adicional).
   * Ningun error crudo del driver forma parte de estos resultados.
   *
   * D3-A (`design.md`): no existe precondicion de `status` en este contrato —
   * la suspension acota su efecto fail-closed a las nuevas operaciones
   * financieras del tenant (`02-workflows/tenant-suspension`), no a la
   * administracion global del registro, y el contrato aceptado no declara un
   * estado-error. La determinacion se implementa literal; REVIEW la confirma.
   *
   * GAP bloqueante (S6, autorizacion humana pendiente): el write set canonico
   * exige ademas la evidencia de auditoria append-only en la misma transaccion,
   * a traves de una superficie publica del modulo `audit` (hoy solo expone
   * lectura; `apps/bus-impl-v2/src/audit/**` esta fuera de `allowed_paths`).
   * Hasta que esa interfaz exista y D1 este confirmado, esta edicion no
   * satisface el write set atomico completo y no debe activarse en runtime: no
   * se escribe la tabla ajena ni se simula evidencia.
   */
  async update(input: TenantUpdateInput): Promise<TenantUpdateResult> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(tenantTable)
        .set({
          ...(input.name === undefined ? {} : { name: input.name }),
          updated_at: new Date().toISOString(),
          version: sql`${tenantTable.version} + 1`,
        })
        .where(
          and(eq(tenantTable.id, input.tenantId), eq(tenantTable.version, input.expectedVersion)),
        )
        .returning(tenantProjection);

      if (row) {
        return { outcome: "updated", tenant: this.toCommittedProjection(row) };
      }

      const [current] = await tx
        .select({ id: tenantTable.id })
        .from(tenantTable)
        .where(eq(tenantTable.id, input.tenantId));

      return current ? { outcome: "stale" } : { outcome: "not_found" };
    });
  }

  /**
   * Ejecuta la transicion `ACTIVE → SUSPENDED` como compare-and-write
   * (optimistic concurrency) dentro de una transaccion local del adapter.
   *
   * El `WHERE` incluye identidad + `version = expected_version` + estado
   * `ACTIVE`: la base de datos es el guard final de carreras y ninguna
   * escritura obsoleta puede sobrescribir una version mas nueva. Una fila
   * afectada devuelve la proyeccion publica confirmada; cero filas se clasifica
   * leyendo la fila dentro de la misma transaccion — inexistente ⇒
   * `not_found`; existente ⇒ `stale` (version desactualizada o estado actual
   * no suspendible). Ningun error crudo del driver forma parte de estos
   * resultados.
   *
   * GAP bloqueante (S6, autorizacion humana pendiente): el write set canonico
   * exige ademas la evidencia de auditoria append-only y el outbox row en la
   * misma transaccion, a traves de superficies publicas del modulo `audit`
   * (hoy solo expone lectura; `apps/bus-impl-v2/src/audit/**` esta fuera de
   * `allowed_paths`). Hasta que esas superficies existan y D1 este confirmado,
   * esta transicion no satisface el write set atomico completo y no debe
   * activarse en runtime: no se escribe la tabla ajena ni se simula evidencia.
   */
  async suspend(input: TenantSuspendInput): Promise<TenantSuspendResult> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(tenantTable)
        .set({
          status: "SUSPENDED",
          suspension_reason: input.reason,
          updated_at: new Date().toISOString(),
          version: sql`${tenantTable.version} + 1`,
        })
        .where(
          and(
            eq(tenantTable.id, input.tenantId),
            eq(tenantTable.version, input.expectedVersion),
            eq(tenantTable.status, "ACTIVE"),
          ),
        )
        .returning(tenantProjection);

      if (row) {
        return { outcome: "suspended", tenant: this.toCommittedProjection(row) };
      }

      const [current] = await tx
        .select({ id: tenantTable.id })
        .from(tenantTable)
        .where(eq(tenantTable.id, input.tenantId));

      return current ? { outcome: "stale" } : { outcome: "not_found" };
    });
  }

  /**
   * Normaliza la proyeccion de base de datos a la forma publica del contrato
   * (timestamps ISO 8601 UTC), sin exponer columnas internas.
   */
  private toCommittedProjection(row: {
    created_at: string;
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "SUSPENDED";
    suspension_reason: string | null;
    updated_at: string;
    version: number;
  }): TenantSchema {
    return {
      ...row,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Predicados aprobados del listado. El registro es global: no existe
   * predicado de tenant y ningun valor de request amplia el alcance; la
   * autorizacion de la capacidad se resuelve en la capa de aplicacion.
   */
  private buildFilters(query: TenantsIndexQueryDto): SQL[] {
    const filters: SQL[] = [];

    if (query.search) {
      const term = `%${query.search}%`;
      const searchFilter = or(ilike(tenantTable.slug, term), ilike(tenantTable.name, term));

      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    if (query.status) {
      filters.push(eq(tenantTable.status, query.status));
    }

    return filters;
  }

  /**
   * Enlaces de pagina relativos que reproducen la misma ventana de resultados
   * (filtros + orden) para la pagina solicitada.
   */
  private pageLink(query: TenantsIndexQueryDto, page: number): string {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(query.page_size));
    params.set("sort", query.sort);

    if (query.search) {
      params.set("search", query.search);
    }

    if (query.status) {
      params.set("status", query.status);
    }

    return `/tenants?${params.toString()}`;
  }
}

/**
 * Detecta la violacion del constraint global `tenants_slug_unique`
 * (PostgreSQL 23505) sin dejar escapar nada del driver: el unico efecto hacia
 * arriba es el conflicto canonico de identidad de negocio.
 */
function isTenantSlugUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error) || error.code !== "23505") {
    return false;
  }

  return "constraint" in error && error.constraint === "tenants_slug_unique";
}
