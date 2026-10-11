import { Injectable } from "@nestjs/common";
import type {
  TrustedTenantContext,
  TrustedTenantContextResolver,
} from "@/identity/application/security/trusted-tenant-context";

/**
 * Resolver HTTP del tenant de confianza para `identity.users-store`.
 *
 * El tenant debe provenir de una sesion autenticada o de un envelope de
 * workload verificado: nunca de query/body/params. La superficie de
 * sesion/membresia es propiedad de los packs `identity.*` (GAP-11) y aun no
 * esta materializada; mientras no exista una fuente verificable este resolver
 * devuelve `null` y el caso de uso responde 403 deny-by-default. Cuando la
 * membresia exista, este adapter es el unico punto que debe leerla y
 * proyectarla como `TrustedTenantContext`.
 */
@Injectable()
export class HttpTrustedTenantContextResolver implements TrustedTenantContextResolver {
  resolve(): Promise<TrustedTenantContext | null> {
    return Promise.resolve(null);
  }
}
