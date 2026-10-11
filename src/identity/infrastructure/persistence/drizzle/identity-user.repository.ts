import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { UsersStoreRequestDto } from "@/identity/application/dtos/users-store.request.dto";
import { IdentityStoreBlockedError } from "@/identity/application/errors/identity-store-blocked.error";
import type {
  IdentityUserUpdateInput,
  IdentityUserUpdateResult,
  IIdentityUserRepository,
} from "@/identity/application/repositories/identity-user.repository.interface";
import type { IdentityUserSchema } from "@/identity/application/schemas/identity-user.schema";
import type { TrustedTenantContext } from "@/identity/application/security/trusted-tenant-context";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";
import { identityUserTable } from "./schema";

/**
 * Columnas expuestas por la proyeccion publica del agregado `user`.
 *
 * Se listan una a una para no acoplar el contrato HTTP a la forma completa de
 * la tabla ni filtrar columnas internas si el schema evoluciona. No incluye
 * material secreto ni columnas fuera del contrato aceptado.
 */
const identityUserProjection = {
  created_at: identityUserTable.created_at,
  display_name: identityUserTable.display_name,
  email: identityUserTable.email,
  id: identityUserTable.id,
  role_ids: identityUserTable.role_ids,
  status: identityUserTable.status,
  tenant_id: identityUserTable.tenant_id,
  updated_at: identityUserTable.updated_at,
  version: identityUserTable.version,
};

/**
 * Adapter Drizzle del agregado `user`.
 *
 * La lectura `show` es una consulta puntual por clave primaria acotada por el
 * predicado de tenant obligatorio (argumento separado, jamas desde la
 * request): un identificador de otro tenant se resuelve `null`, exactamente
 * igual que una ausencia, y la clasificacion 404 no reveladora vive en el
 * service. Proyeccion explicita, `limit(1)`, sin `select *`, sin transaccion,
 * sin cache y sin concatenacion de SQL; ningun error crudo del driver cruza
 * esta frontera.
 *
 * La edicion `update` es un compare-and-write tenant-scoped en una transaccion
 * local del adapter (precedente materializado `tenant.tenants-update`): el
 * predicado de tenant participa de la mutacion y de la clasificacion de cero
 * filas, por lo que solo una fila vigente del mismo tenant produce `stale`.
 *
 * El alta queda fail-closed: el write set canonico exige persistir `user` +
 * evidencia de auditoria append-only en la misma transaccion (S6: la interfaz
 * publica de append del modulo `audit` aun no existe y esa raiz esta fuera de
 * `allowed_paths`) y el valor inicial de `status` (D2) no esta confirmado por
 * el owner. Este adapter no persiste ningun valor improvisado ni escribe la
 * tabla ajena de auditoria: falla cerrado antes del insert con
 * `IdentityStoreBlockedError`.
 *
 * Cuando D2 se confirme y S6 exista, aqui vive el insert de columnas
 * explicitas (`tenant_id`, `email`, `display_name`, `role_ids`) con el
 * default de base de datos aplicando `version = 1`, timestamps y el `status`
 * inicial confirmado; la traduccion del 23505 de
 * `identity_users_tenant_email_unique` a `UserIdentityConflictError` (sin
 * dejar escapar nada del driver) y la proyeccion publica confirmada con
 * normalizacion ISO de timestamps. La operacion no debe activarse antes de
 * eso (tampoco la registra este pack: D1/S1).
 */
@Injectable()
export class IdentityUserRepository implements IIdentityUserRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  /**
   * Lectura puntual tenant-scoped por identidad inmutable.
   *
   * Lookup `id = :userId AND tenant_id = :trustedTenant` sobre el indice de la
   * clave primaria: es la ruta de acceso justificada por
   * `EP-IDENTITY-USERS-SHOW-001` (tenant + clave inmutable) y no se agrega un
   * indice especulativo. Sin transaccion, sin cache y sin publicacion de
   * eventos (async NOT_APPLICABLE): solo lectura.
   */
  async show(
    userId: string,
    tenantContext: TrustedTenantContext,
  ): Promise<IdentityUserSchema | null> {
    const [row] = await this.db
      .select(identityUserProjection)
      .from(identityUserTable)
      .where(
        and(
          eq(identityUserTable.id, userId),
          eq(identityUserTable.tenant_id, tenantContext.tenantId),
        ),
      )
      .limit(1);

    return row ? this.toCommittedProjection(row) : null;
  }

  store(
    input: UsersStoreRequestDto,
    tenantContext: TrustedTenantContext,
  ): Promise<IdentityUserSchema> {
    void input;
    void tenantContext;
    void this.db;

    throw new IdentityStoreBlockedError();
  }

  /**
   * Ejecuta la edicion de los campos mutables del usuario como
   * compare-and-write (optimistic concurrency) dentro de una transaccion local
   * del adapter.
   *
   * El `WHERE` incluye identidad + tenant de confianza + `version =
   * expected_version`: la base de datos es el guard final de carreras (una
   * version obsoleta jamas sobrescribe una mas nueva; no hay
   * last-write-wins ni lock en memoria). Una fila afectada devuelve la
   * proyeccion publica confirmada con `version` incrementada y `updated_at`
   * avanzado; cero filas se clasifica leyendo la fila dentro de la misma
   * transaccion con el mismo predicado de tenant — ausente o de otro tenant
   * ⇒ `not_found` (indistinguibles; la respuesta 404 no reveladora vive en el
   * service); existente en el tenant ⇒ `stale` (version desactualizada).
   * `display_name`/`role_ids` ausentes conservan el valor vigente y el CAS se
   * ejecuta igualmente (contrato aceptado; sin validacion adicional ni
   * precondicion de `status`). Ningun error crudo del driver forma parte de
   * estos resultados.
   *
   * GAP bloqueante (S6, autorizacion humana pendiente): el write set canonico
   * exige ademas la evidencia de auditoria append-only en la misma
   * transaccion, a traves de una superficie publica del modulo `audit` (hoy
   * solo expone lectura; `apps/bus-impl-v2/src/audit/**` esta fuera de
   * `allowed_paths`). Hasta que esa interfaz exista y D1 este confirmado, esta
   * edicion no satisface el write set atomico completo y no debe activarse en
   * runtime: no se escribe la tabla ajena ni se simula evidencia. Cuando S6
   * llegue, la frontera de transaccion se mueve al application service para
   * que la fila y la evidencia de auditoria commiteen atomicamente.
   */
  async update(
    input: IdentityUserUpdateInput,
    tenantContext: TrustedTenantContext,
  ): Promise<IdentityUserUpdateResult> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(identityUserTable)
        .set({
          ...(input.displayName === undefined ? {} : { display_name: input.displayName }),
          ...(input.roleIds === undefined ? {} : { role_ids: input.roleIds }),
          updated_at: new Date().toISOString(),
          version: sql`${identityUserTable.version} + 1`,
        })
        .where(
          and(
            eq(identityUserTable.id, input.userId),
            eq(identityUserTable.tenant_id, tenantContext.tenantId),
            eq(identityUserTable.version, input.expectedVersion),
          ),
        )
        .returning(identityUserProjection);

      if (row) {
        return { outcome: "updated", user: this.toCommittedProjection(row) };
      }

      const [current] = await tx
        .select({ id: identityUserTable.id })
        .from(identityUserTable)
        .where(
          and(
            eq(identityUserTable.id, input.userId),
            eq(identityUserTable.tenant_id, tenantContext.tenantId),
          ),
        );

      return current ? { outcome: "stale" } : { outcome: "not_found" };
    });
  }

  /**
   * Normaliza la proyeccion publica confirmada: los timestamps UTC del driver
   * se serializan ISO-8601 antes de cruzar hacia el contrato compartido; el
   * resto de las columnas ya pertenecen al contrato (identidad, email
   * normalizado, nombre, estado, roles y version).
   */
  private toCommittedProjection(row: {
    created_at: string;
    display_name: string;
    email: string;
    id: string;
    role_ids: string[];
    status: "ACTIVE" | "DISABLED" | "PENDING";
    tenant_id: string;
    updated_at: string;
    version: number;
  }): IdentityUserSchema {
    return {
      ...row,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }
}
