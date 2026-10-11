import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ProvidersIndexQueryDto } from "@/provider/application/dtos/providers-index.request.dto";
import type { ProvidersIndexResponseDto } from "@/provider/application/dtos/providers-index.response.dto";
import type { ProvidersStoreRequestDto } from "@/provider/application/dtos/providers-store.request.dto";
import { ProviderDisableBlockedError } from "@/provider/application/errors/provider-disable-blocked.error";
import { ProviderStoreBlockedError } from "@/provider/application/errors/provider-store-blocked.error";
import type {
  IProviderRepository,
  ProviderDisableInput,
  ProviderDisableResult,
} from "@/provider/application/repositories/provider.repository.interface";
import type { ProviderSchema } from "@/provider/application/schemas/provider.schema";
import type { TrustedTenantContext } from "@/provider/application/security/trusted-tenant-context";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";
import { providerTable } from "./schema";

/**
 * Columnas expuestas por la proyeccion publica del agregado `provider`.
 *
 * Se listan una a una para no acoplar el contrato HTTP a la forma completa de
 * la tabla ni filtrar columnas internas si el schema evoluciona; coincide con
 * el slice canonico aceptado (`providerSchema`).
 */
const providerProjection = {
  code: providerTable.code,
  created_at: providerTable.created_at,
  id: providerTable.id,
  name: providerTable.name,
  status: providerTable.status,
  tenant_id: providerTable.tenant_id,
  updated_at: providerTable.updated_at,
  version: providerTable.version,
};

/**
 * Adapter Drizzle del agregado `provider`.
 *
 * El alta queda fail-closed: el write set canonico exige persistir `provider`
 * + evidencia de auditoria append-only en la misma transaccion (S6: la
 * interfaz publica de append del modulo `audit` aun no existe y esa raiz esta
 * fuera de `allowed_paths`) y el valor inicial de `status` (D1) no esta
 * confirmado por el owner. Este adapter no persiste ningun valor improvisado
 * ni escribe la tabla ajena de auditoria: falla cerrado antes del insert con
 * `ProviderStoreBlockedError`.
 *
 * Cuando D1 se confirme y S6 exista, aqui vive el insert de columnas
 * explicitas (`tenant_id`, `code`, `name`) con el default de base de datos
 * aplicando `version = 1`, timestamps y el `status` inicial confirmado; la
 * traduccion del 23505 de `providers_tenant_code_unique` a
 * `ProviderIdentityConflictError` (sin dejar escapar nada del driver) y la
 * proyeccion publica confirmada con normalizacion ISO de timestamps. La
 * operacion no debe activarse antes de eso (tampoco la registra este pack:
 * S1).
 */
@Injectable()
export class ProviderRepository implements IProviderRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  /**
   * Listado tenant-scoped de providers (`EP-PROVIDER-PROVIDERS-INDEX-001`).
   *
   * Lectura purpose-specific y determinista:
   * - proyeccion explicita (`providerProjection`), jamas fila cruda ni
   *   columnas internas;
   * - el predicado del tenant de confianza (`tenant_id = :trustedTenant`)
   *   encabeza **ambos** statements (conteo y datos), de modo que los filtros,
   *   el conteo y los enlaces de paginacion describen la misma superficie y
   *   no pueden convertirse en un oraculo cross-tenant;
   * - `search` parametrizado (`ilike`) solo sobre los campos aprobados
   *   (`code`/`name`) y `status` por igualdad al enum del ciclo de vida;
   * - orden determinista `(created_at, id)` con el tie-breaker en la misma
   *   direccion del `sort` aceptado;
   * - paginacion acotada (`page_size` 1..100 coercado en el boundary) con
   *   `limit`/`offset`;
   * - conteo autorizado con `count()` sobre la misma clausula `where`;
   * - `next`/`previous` construidos con la misma superficie filtrada.
   *
   * Solo lectura: no abre transaccion, no escribe estado canonico, no escribe
   * cache ni auditoria, y una repeticion concurrente es segura (se re-autoriza
   * en cada ejecucion). Ningun error crudo del driver forma parte del
   * resultado. La tabla `providers` requiere la migracion versionada (S2,
   * compartida por los slices hermanos); su ausencia no se compensa con SQL
   * ad-hoc fuera de `drizzle/**`.
   */
  async index(
    query: ProvidersIndexQueryDto,
    tenantContext: TrustedTenantContext,
  ): Promise<ProvidersIndexResponseDto> {
    const where = and(...this.buildIndexFilters(query, tenantContext));

    const [totalRow] = await this.db.select({ total: count() }).from(providerTable).where(where);
    const total = Number(totalRow?.total ?? 0);

    const order =
      query.sort === "created_at_asc"
        ? [asc(providerTable.created_at), asc(providerTable.id)]
        : [desc(providerTable.created_at), desc(providerTable.id)];

    const rows = await this.db
      .select(providerProjection)
      .from(providerTable)
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

  store(
    input: ProvidersStoreRequestDto,
    tenantContext: TrustedTenantContext,
  ): Promise<ProviderSchema> {
    void input;
    void tenantContext;
    void this.db;

    throw new ProviderStoreBlockedError();
  }

  /**
   * Deshabilitacion `ACTIVE -> DISABLED` — target design documentado en el
   * lugar; entrega **fail-closed** (S6/S2).
   *
   * Cuando la interfaz publica de append del modulo `audit` (S6) y la
   * migracion versionada de `providers` (S2) existan, la transicion se ejecuta
   * aqui como compare-and-write optimista dentro de una transaccion local: un
   * unico `UPDATE providers SET status = 'DISABLED', version = version + 1,
   * updated_at = now WHERE tenant_id = :trustedTenant AND id = :providerId AND
   * version = :expectedVersion AND status = 'ACTIVE'` con `returning` explicito
   * de la proyeccion publica (timestamps normalizados ISO 8601 UTC); cero filas
   * se clasifica leyendo la fila dentro de la misma transaccion con el
   * predicado de tenant — inexistente ⇒ `not_found`; existente ⇒ `stale`
   * (version desactualizada o estado no deshabilitable, jamas una segunda
   * transicion). La base de datos es el guard final de carreras (sin
   * last-write-wins) y ningun error crudo del driver forma parte de estos
   * resultados. El write set canonico exige ademas la evidencia de auditoria
   * append-only en la misma transaccion (S6) para que la fila y su evidencia
   * commiteen atomicamente (el boundary de transaccion se mueve al application
   * service cuando esa interfaz exista); el motivo gobernado jamas se persiste
   * en la fila del provider ni se simula.
   *
   * Entrega actual: el adapter no escribe un estado parcial, no escribe la
   * tabla ajena ni simula la evidencia; falla cerrado con
   * {@link ProviderDisableBlockedError}.
   */
  disable(
    input: ProviderDisableInput,
    tenantContext: TrustedTenantContext,
  ): Promise<ProviderDisableResult> {
    void input;
    void tenantContext;
    void this.db;

    throw new ProviderDisableBlockedError();
  }

  /**
   * Normaliza la proyeccion de base de datos a la forma publica del contrato
   * (`providerSchema`, timestamps ISO 8601 UTC), sin exponer columnas
   * internas.
   */
  private toCommittedProjection(row: {
    code: string;
    created_at: string;
    id: string;
    name: string;
    status: "ACTIVE" | "DISABLED";
    tenant_id: string;
    updated_at: string;
    version: number;
  }): ProviderSchema {
    return {
      ...row,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Predicados aprobados del listado. El primero — e innegociable — es el
   * tenant de confianza: ningun valor de la query amplia el alcance ni actua
   * como alias de `tenant_id`. `search` se parametriza con `ilike` sobre
   * `code`/`name` (campos aprobados) y `status` filtra por igualdad.
   */
  private buildIndexFilters(
    query: ProvidersIndexQueryDto,
    tenantContext: TrustedTenantContext,
  ): SQL[] {
    const filters: SQL[] = [eq(providerTable.tenant_id, tenantContext.tenantId)];

    if (query.search) {
      const term = `%${query.search}%`;
      const searchFilter = or(ilike(providerTable.code, term), ilike(providerTable.name, term));

      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    if (query.status) {
      filters.push(eq(providerTable.status, query.status));
    }

    return filters;
  }

  /**
   * Enlaces de pagina relativos que reproducen la misma ventana de resultados
   * (filtros + orden) del tenant de confianza para la pagina solicitada; se
   * construyen desde la misma superficie tenant-scoped para que no revelen
   * datos de otro tenant.
   */
  private pageLink(query: ProvidersIndexQueryDto, page: number): string {
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

    return `/providers?${params.toString()}`;
  }
}
