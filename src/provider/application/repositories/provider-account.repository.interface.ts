import type { ProviderAccountsStoreRequestDto } from "../dtos/provider-accounts-store.request.dto";
import type { ProviderAccountSchema } from "../schemas/provider-account.schema";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";

/**
 * Resultado tipado del alta de una cuenta de proveedor.
 *
 * - `stored`: la fila commiteo y la proyeccion devuelta es el estado
 *   confirmado post-commit (status inicial per D5 cuando este confirmado,
 *   `version` en el default de base de datos `1`, timestamps UTC; sin campos
 *   de secreto por el default fail-closed de D6).
 * - `provider_not_found`: el `provider_id` de la request no pertenece al
 *   tenant de confianza (o no existe). El llamador responde de forma no
 *   reveladora (403, `TENANT_SCOPE_VIOLATION`) sin distinguir la causa: la
 *   posesion de un identificador jamas otorga alcance ni produce un oraculo
 *   de existencia.
 */
export type ProviderAccountStoreResult =
  | { outcome: "stored"; account: ProviderAccountSchema }
  | { outcome: "provider_not_found" };

/**
 * Puerto del agregado `provider_account` del contexto `provider`.
 *
 * Expone solo la mutacion especifica de creacion (`store`) con el scope de
 * tenant como argumento obligatorio y separado, para que ningun valor del
 * body pueda ampliarlo; no existe una superficie generica de escritura que
 * permita saltarse invariantes del modelo. La identidad de negocio durable es
 * local al tenant (D4, pendiente de confirmacion) y la base de datos sera el
 * guard final de carreras cuando S2 materialice el constraint. La precondicion
 * de referencia same-tenant (`provider_id`) es contractual aqui y se resuelve
 * dentro del adapter del mismo modulo: un read purpose-specific o un insert
 * guardado con el predicado de tenant — nunca una tabla de otro modulo ni una
 * superficie cross-agregado generica.
 */
export interface IProviderAccountRepository {
  store(
    input: ProviderAccountsStoreRequestDto,
    tenantContext: TrustedTenantContext,
  ): Promise<ProviderAccountStoreResult>;
}
