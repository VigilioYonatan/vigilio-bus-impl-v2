import { Injectable } from "@nestjs/common";
import type {
  TrustedTenantContext,
  TrustedTenantContextResolver,
} from "@/audit/application/security/trusted-tenant-context";

/**
 * Resolver HTTP del tenant de confianza.
 *
 * El tenant debe provenir de una sesion autenticada o de un envelope de
 * workload verificado: nunca de query/body/params. La membresia de tenant es
 * propiedad de los contextos `identity`/`tenant`, que aun no estan
 * materializados (GAP registrado del pack); mientras no exista una fuente
 * verificable este resolver devuelve `null` y el caso de uso responde 403
 * deny-by-default. Cuando la membresia exista, este adapter es el unico punto
 * que debe leerla y proyectarla como `TrustedTenantContext`.
 */
@Injectable()
export class HttpTrustedTenantContextResolver implements TrustedTenantContextResolver {
  resolve(): Promise<TrustedTenantContext | null> {
    return Promise.resolve(null);
  }
}
