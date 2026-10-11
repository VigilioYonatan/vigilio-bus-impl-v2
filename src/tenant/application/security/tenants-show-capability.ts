import type { AuthenticatedUser } from "@/shared/infrastructure/security/authenticated-request";

/**
 * Mapeo ejecutable de la capacidad privilegiada `tenant:tenants:show`.
 *
 * El vocabulario de roles es propiedad del shared security del repositorio
 * (`admin`, `operador`, `auditor`, `soporte`) y este pack no introduce un
 * sistema de autorizacion nuevo. La lectura del registro global de tenants es
 * una operacion privilegiada de administracion global: se ejecuta unicamente
 * con el rol `admin`, y el transporte la exige ademas con `@Roles("admin")` en
 * el controller. Un identificador de tenant en la request jamas eleva el
 * alcance. Es una lectura sin transicion de estado: el contrato canonico no
 * declara una precondicion de step-up/aprobacion (Q-010 clasifica operaciones
 * privilegiadas con efecto; nada se agrega por inferencia).
 */
export const TENANTS_SHOW_ROLES: readonly AuthenticatedUser["role"][] = ["admin"];

export type TenantsShowActor = Pick<AuthenticatedUser, "id" | "role">;

/**
 * Precondicion deny-by-default del caso de uso.
 *
 * Devuelve `false` cuando no hay actor autenticado (invocacion fuera del
 * pipeline HTTP o sesion ausente) o el rol no esta autorizado para la
 * capacidad. El llamador responde 403 sin revelar existencia ni contenido del
 * registro, y el 404 posterior es igualmente no revelador dentro del alcance
 * autorizado.
 */
export function canShowTenants(actor: TenantsShowActor | null): boolean {
  return actor !== null && TENANTS_SHOW_ROLES.includes(actor.role);
}

/**
 * Proyecta el usuario autenticado del transporte al actor del caso de uso.
 *
 * El controller es el unico punto que lee `request.user`; la capa de
 * aplicacion recibe un contrato nombrado y no depende de Express/Nest.
 */
export function toTenantsShowActor(user: AuthenticatedUser | undefined): TenantsShowActor | null {
  return user ? { id: user.id, role: user.role } : null;
}
