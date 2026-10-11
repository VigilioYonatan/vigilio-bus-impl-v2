import type { AuthenticatedUser } from "@/shared/infrastructure/security/authenticated-request";

/**
 * Mapeo ejecutable de la capacidad privilegiada `tenant:tenants:index`.
 *
 * El vocabulario de roles es propiedad del shared security del repositorio
 * (`admin`, `operador`, `auditor`, `soporte`) y este pack no introduce un
 * sistema de autorizacion nuevo. La administracion global del registro de
 * tenants es una operacion excepcional y auditable: se ejecuta unicamente con
 * el rol `admin`, y el transporte la exige ademas con `@Roles("admin")` en el
 * controller. Un identificador de tenant en la request jamas eleva el alcance.
 */
export const TENANTS_INDEX_ROLES: readonly AuthenticatedUser["role"][] = ["admin"];

export type TenantsIndexActor = Pick<AuthenticatedUser, "id" | "role">;

/**
 * Precondicion deny-by-default del caso de uso.
 *
 * Devuelve `false` cuando no hay actor autenticado (invocacion fuera del
 * pipeline HTTP o sesion ausente) o el rol no esta autorizado para la
 * capacidad. El llamador responde 403 sin revelar contenido del registro.
 */
export function canIndexTenants(actor: TenantsIndexActor | null): boolean {
  return actor !== null && TENANTS_INDEX_ROLES.includes(actor.role);
}

/**
 * Proyecta el usuario autenticado del transporte al actor del caso de uso.
 *
 * El controller es el unico punto que lee `request.user`; la capa de
 * aplicacion recibe un contrato nombrado y no depende de Express/Nest.
 */
export function toTenantsIndexActor(user: AuthenticatedUser | undefined): TenantsIndexActor | null {
  return user ? { id: user.id, role: user.role } : null;
}
