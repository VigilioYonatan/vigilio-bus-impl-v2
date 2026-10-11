import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AuditIndexQueryDto } from "@/audit/application/dtos/audit-index.request.dto";
import type { AuditIndexResponseDto } from "@/audit/application/dtos/audit-index.response.dto";
import type { AuditShowResponseDto } from "@/audit/application/dtos/audit-show.response.dto";
import type { IAuditEventRepository } from "@/audit/application/repositories/audit-event.repository.interface";
import type { TrustedTenantContext } from "@/audit/application/security/trusted-tenant-context";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";
import { auditEventTable } from "./schema";

/**
 * Columnas expuestas por la proyeccion de lectura.
 *
 * Se listan una a una para no acoplar el contrato HTTP a la forma completa de
 * la tabla ni filtrar columnas internas si el schema evoluciona.
 */
const auditEventProjection = {
  action: auditEventTable.action,
  actor_id: auditEventTable.actor_id,
  correlation_id: auditEventTable.correlation_id,
  id: auditEventTable.id,
  metadata: auditEventTable.metadata,
  occurred_at: auditEventTable.occurred_at,
  reason: auditEventTable.reason,
  resource_id: auditEventTable.resource_id,
  resource_type: auditEventTable.resource_type,
  tenant_id: auditEventTable.tenant_id,
};

@Injectable()
export class AuditEventRepository implements IAuditEventRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  async index(
    query: AuditIndexQueryDto,
    scope: TrustedTenantContext,
  ): Promise<AuditIndexResponseDto> {
    const filters = this.buildFilters(query, scope);
    const where = and(...filters);

    const [totalRow] = await this.db.select({ total: count() }).from(auditEventTable).where(where);
    const total = Number(totalRow?.total ?? 0);

    const order =
      query.sort === "occurred_at_desc"
        ? [desc(auditEventTable.occurred_at), desc(auditEventTable.id)]
        : [asc(auditEventTable.occurred_at), asc(auditEventTable.id)];

    const rows = await this.db
      .select(auditEventProjection)
      .from(auditEventTable)
      .where(where)
      .orderBy(...order)
      .limit(query.page_size)
      .offset((query.page - 1) * query.page_size);

    return {
      success: true,
      count: total,
      next: query.page * query.page_size < total ? this.pageLink(query, query.page + 1) : null,
      previous: query.page > 1 ? this.pageLink(query, query.page - 1) : null,
      results: rows.map((row) => ({
        ...row,
        occurred_at: new Date(row.occurred_at).toISOString(),
      })),
    };
  }

  /**
   * Recupera un unico evento autorizado del tenant de confianza.
   *
   * Una sola sentencia: el predicado de tenant es el primero del WHERE junto
   * con la clave primaria `id`, la proyeccion es explicita (misma lista de
   * columnas permitidas que el listado) y `occurred_at` se serializa ISO.
   * El resultado `null` es intencionalmente ambiguo (ausente, de otro tenant o
   * global): el caso de uso lo traduce a un 404 identico que no revela la
   * existencia de recursos ajenos. Los errores crudos del driver quedan dentro
   * del adapter: no se capturan ni se exponen como parte del contrato.
   */
  async show(
    auditEventId: string,
    scope: TrustedTenantContext,
  ): Promise<AuditShowResponseDto["result"] | null> {
    const [row] = await this.db
      .select(auditEventProjection)
      .from(auditEventTable)
      .where(
        and(eq(auditEventTable.tenant_id, scope.tenantId), eq(auditEventTable.id, auditEventId)),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      ...row,
      occurred_at: new Date(row.occurred_at).toISOString(),
    };
  }

  /**
   * Predicados del listado. El scope de tenant viene resuelto desde la sesion
   * de confianza y siempre es parte del WHERE: la posesion de identificadores
   * jamas amplia el alcance.
   */
  private buildFilters(query: AuditIndexQueryDto, scope: TrustedTenantContext): SQL[] {
    const filters: SQL[] = [eq(auditEventTable.tenant_id, scope.tenantId)];

    if (query.search) {
      const term = `%${query.search}%`;
      const searchFilter = or(
        ilike(auditEventTable.action, term),
        ilike(auditEventTable.actor_id, term),
        ilike(auditEventTable.resource_type, term),
        ilike(auditEventTable.resource_id, term),
      );

      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    if (query.action) {
      filters.push(eq(auditEventTable.action, query.action));
    }

    if (query.actor_id) {
      filters.push(eq(auditEventTable.actor_id, query.actor_id));
    }

    if (query.from) {
      filters.push(gte(auditEventTable.occurred_at, query.from));
    }

    if (query.to) {
      filters.push(lte(auditEventTable.occurred_at, query.to));
    }

    return filters;
  }

  /**
   * Enlaces de pagina relativos que reproducen la misma ventana de resultados
   * (filtros + orden) para la pagina solicitada.
   */
  private pageLink(query: AuditIndexQueryDto, page: number): string {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(query.page_size));
    params.set("sort", query.sort);

    if (query.search) {
      params.set("search", query.search);
    }

    if (query.action) {
      params.set("action", query.action);
    }

    if (query.actor_id) {
      params.set("actor_id", query.actor_id);
    }

    if (query.from) {
      params.set("from", query.from);
    }

    if (query.to) {
      params.set("to", query.to);
    }

    return `/audit-events?${params.toString()}`;
  }
}
