/**
 * Tenant de confianza de la ejecucion.
 *
 * Nunca se construye desde query/body/params: lo resuelve un adapter desde la
 * sesion autenticada o desde un envelope de workload verificado. La posesion
 * de un identificador jamas otorga acceso.
 */
export type TrustedTenantContext = {
  tenantId: string;
};

/**
 * Puerto de resolucion del tenant de confianza.
 *
 * La membresia/tenant es propiedad de los contextos `identity`/`tenant`; este
 * puerto solo consume la resolucion ya verificada. Devolver `null` significa
 * "sin scope de tenant establecido" y el caso de uso responde deny-by-default.
 */
export interface TrustedTenantContextResolver {
  resolve(): Promise<TrustedTenantContext | null>;
}
