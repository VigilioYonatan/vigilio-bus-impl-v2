/**
 * Tenant de confianza de la ejecucion de `provider.providers-store`.
 *
 * Nunca se construye desde query/body/params: lo resuelve un adapter desde la
 * sesion autenticada o desde un envelope de workload verificado, y es la
 * unica fuente del `tenant_id` del provider creado. La posesion de un
 * identificador jamas otorga acceso.
 */
export type TrustedTenantContext = {
  tenantId: string;
};

/**
 * Puerto de resolucion del tenant de confianza.
 *
 * La membresia/tenant es propiedad de las superficies de sesion/membresia de
 * los contextos `identity`/`tenant` (GAP-11: aun no materializadas); este
 * puerto solo consume la resolucion ya verificada. Devolver `null` significa
 * "sin scope de tenant establecido" y el caso de uso responde deny-by-default
 * (403).
 */
export interface TrustedTenantContextResolver {
  resolve(): Promise<TrustedTenantContext | null>;
}
