import type { NormalizationMappingsStoreRequestDto } from "../dtos/normalization-mappings-store.request.dto";
import type { NormalizationMappingSchema } from "../schemas/normalization-mapping.schema";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";

/**
 * Resultado tipado del alta de un mapeo de normalizacion.
 *
 * - `stored`: la fila commiteo y la proyeccion devuelta es el estado
 *   confirmado post-commit (status inicial per D3 cuando este confirmado,
 *   `version` en el default de base de datos `1`, timestamps UTC).
 * - `provider_not_found`: el `provider_id` de la request no pertenece al tenant
 *   de confianza (o no existe). El llamador responde de forma no reveladora
 *   (403, `TENANT_SCOPE_VIOLATION`) sin distinguir la causa: la posesion de un
 *   identificador jamas otorga alcance ni produce un oraculo de existencia.
 */
export type NormalizationMappingStoreResult =
  | { outcome: "stored"; mapping: NormalizationMappingSchema }
  | { outcome: "provider_not_found" };

/**
 * Puerto del agregado `normalization_mapping` del contexto `provider`.
 *
 * Expone solo la mutacion especifica de creacion (`store`) con el scope de
 * tenant como argumento obligatorio y separado, para que ningun valor del body
 * pueda ampliarlo; no existe una superficie generica de escritura que permita
 * saltarse invariantes del modelo. La identidad de negocio durable es local al
 * tenant (D2) y la base de datos es el guard final de carreras. La
 * precondicion de referencia same-tenant (`provider_id`) se resuelve dentro del
 * adapter del mismo modulo: un read purpose-specific o un insert guardado con
 * el predicado de tenant — nunca una tabla de otro modulo ni una superficie
 * cross-agregado generica.
 */
export interface INormalizationMappingRepository {
  store(
    input: NormalizationMappingsStoreRequestDto,
    tenantContext: TrustedTenantContext,
  ): Promise<NormalizationMappingStoreResult>;
}
