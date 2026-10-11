import type { TenantsIndexQueryDto } from "../dtos/tenants-index.request.dto";
import type { TenantsIndexResponseDto } from "../dtos/tenants-index.response.dto";
import type { TenantsStoreRequestDto } from "../dtos/tenants-store.request.dto";
import type { TenantSchema } from "../schemas/tenant.schema";

/**
 * Entrada de la transicion `suspend`.
 *
 * El request ya esta validado por el contrato; `tenantId` llega resuelto por el
 * router y `reason` es la justificacion gobernada (nunca telemetria). La
 * version esperada es el detector de escrituras obsoletas.
 */
export type TenantSuspendInput = {
  expectedVersion: number;
  reason: string;
  tenantId: string;
};

/**
 * Resultado tipado del compare-and-write de suspension.
 *
 * - `suspended`: la fila cumplia version + estado y la proyeccion devuelta es
 *   el estado confirmado post-commit.
 * - `not_found`: no existe el tenant solicitado (respuesta no reveladora).
 * - `stale`: la fila existe pero la version esperada ya no es la vigente o el
 *   estado actual no permite `ACTIVE → SUSPENDED` (conflicto canonico 409;
 *   jamas last-write-wins).
 */
export type TenantSuspendResult =
  | { outcome: "suspended"; tenant: TenantSchema }
  | { outcome: "not_found" }
  | { outcome: "stale" };

/**
 * Entrada de la edicion `update`.
 *
 * El request ya esta validado por el contrato; `tenantId` llega resuelto por el
 * router y `expectedVersion` es el detector durable de escrituras obsoletas.
 * `name` es el unico campo mutable del registro (`endpoints.md` §3): su
 * ausencia en el contrato HTTP conserva el nombre vigente y el CAS se ejecuta
 * igualmente, sin agregar validaciones que el contrato aceptado no declara.
 */
export type TenantUpdateInput = {
  expectedVersion: number;
  name?: string;
  tenantId: string;
};

/**
 * Resultado tipado del compare-and-write de edicion.
 *
 * - `updated`: la fila cumplia `version = expected_version` y la proyeccion
 *   devuelta es el estado confirmado post-commit (`version` incrementada,
 *   `updated_at` avanzado).
 * - `not_found`: no existe el tenant solicitado (respuesta no reveladora).
 * - `stale`: la fila existe pero la version esperada ya no es la vigente
 *   (conflicto canonico 409; jamas last-write-wins). La clasificacion no
 *   agrega una precondicion de estado: la suspension de un tenant acota su
 *   efecto fail-closed a las nuevas operaciones financieras del tenant
 *   (`02-workflows/tenant-suspension`), no a la administracion global del
 *   registro (D3-A, `design.md`).
 */
export type TenantUpdateResult =
  | { outcome: "updated"; tenant: TenantSchema }
  | { outcome: "not_found" }
  | { outcome: "stale" };

/**
 * Puerto del registro global de tenants.
 *
 * Expone solo las operaciones que los casos de uso necesitan: proyeccion
 * purpose-specific con filtros, orden determinista y conteo veraz para el
 * listado (`tenants-index`), la lectura puntual por identidad inmutable del
 * detalle (`tenants-show`), la mutacion especifica de creacion (`store`), la
 * edicion de los campos mutables con concurrencia optimista (`update`) y la
 * transicion de ciclo de vida (`suspend`) con su precondicion de version/estado
 * — sin una superficie generica de escritura que permita saltarse invariantes
 * del modelo. El agregado `tenant` es el registro global de administracion:
 * el control de acceso son las capacidades privilegiadas
 * `tenant:tenants:index` / `tenant:tenants:show` / `tenant:tenants:store` /
 * `tenant:tenants:update` / `tenant:suspend:tenant`, nunca un predicado de
 * tenant proveniente de la request.
 */
export interface ITenantRepository {
  index(query: TenantsIndexQueryDto): Promise<TenantsIndexResponseDto>;
  show(tenantId: string): Promise<TenantSchema | null>;
  store(input: TenantsStoreRequestDto): Promise<TenantSchema>;
  update(input: TenantUpdateInput): Promise<TenantUpdateResult>;
  suspend(input: TenantSuspendInput): Promise<TenantSuspendResult>;
}
