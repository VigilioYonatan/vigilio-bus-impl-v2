import type { ProvidersIndexQueryDto } from "../dtos/providers-index.request.dto";
import type { ProvidersIndexResponseDto } from "../dtos/providers-index.response.dto";
import type { ProvidersStoreRequestDto } from "../dtos/providers-store.request.dto";
import type { ProviderSchema } from "../schemas/provider.schema";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";

/**
 * Entrada de la transicion `disable`.
 *
 * El request ya esta validado por el contrato; `providerId` llega resuelto por
 * el router y `expectedVersion` es el detector durable de escrituras
 * obsoletas. El motivo gobernado no viaja aqui: la evidencia append-only de
 * auditoria (S6) lo recibira desde el service cuando la interfaz publica del
 * modulo `audit` exista.
 */
export type ProviderDisableInput = {
  expectedVersion: number;
  providerId: string;
};

/**
 * Resultado tipado del compare-and-write de deshabilitacion.
 *
 * - `disabled`: la fila cumplia `version = expected_version` + estado
 *   `ACTIVE` (la unica transicion aceptada por el catalogo) y la proyeccion
 *   devuelta es el estado confirmado post-commit (`DISABLED`, `version`
 *   incrementada, `updated_at` avanzado, historial conservado).
 * - `not_found`: no existe el provider solicitado dentro del tenant de
 *   confianza (respuesta no reveladora).
 * - `stale`: la fila existe pero la version esperada ya no es la vigente o el
 *   estado actual no permite `ACTIVE -> DISABLED` (conflicto canonico 409;
 *   jamas last-write-wins ni una segunda transicion).
 */
export type ProviderDisableResult =
  | { outcome: "disabled"; provider: ProviderSchema }
  | { outcome: "not_found" }
  | { outcome: "stale" };

/**
 * Puerto del agregado `provider` del contexto `provider`.
 *
 * Expone solo las operaciones que los casos de uso necesitan: la lectura
 * purpose-specific del listado (`index` — proyeccion explicita, filtros
 * aprobados, orden determinista con tie-breaker `id`, paginacion acotada y
 * conteo veraz, siempre con el predicado del tenant de confianza), la
 * mutacion especifica de creacion (`store`) y la transicion de ciclo de vida
 * (`disable`) con su precondicion de version/estado — cada una con el scope
 * de tenant como argumento obligatorio y separado, para que ningun valor del
 * body/query pueda ampliarlo; no existe una superficie generica de escritura
 * ni un query builder que permita saltarse invariantes del modelo. La
 * identidad durable del alta es `(tenant_id, code)` y la base de datos es el
 * guard final de carreras.
 */
export interface IProviderRepository {
  index(
    query: ProvidersIndexQueryDto,
    tenantContext: TrustedTenantContext,
  ): Promise<ProvidersIndexResponseDto>;
  store(
    input: ProvidersStoreRequestDto,
    tenantContext: TrustedTenantContext,
  ): Promise<ProviderSchema>;
  disable(
    input: ProviderDisableInput,
    tenantContext: TrustedTenantContext,
  ): Promise<ProviderDisableResult>;
}
