import type { AuthenticatedUser } from "@/shared/infrastructure/security/authenticated-request";

/**
 * Mapeo ejecutable de la capacidad privilegiada `tenant:tenants:update`.
 *
 * Actualizar el registro global de tenants es una mutacion privilegiada de
 * administracion global: el registro es propiedad del contexto `tenant` y la
 * operacion se ejecuta unicamente con el rol `admin` del vocabulario existente
 * del shared security — este pack no introduce un sistema de autorizacion
 * nuevo. El transporte la exige ademas con `@Roles("admin")` en el controller,
 * un identificador de tenant en la request jamas eleva el alcance y la
 * visibilidad en la UI nunca es autorizacion.
 *
 * Q-010 y `05-reference/permission-matrix.md` clasifican la suspension y
 * reactivacion de tenants — no la edicion del registro — entre las operaciones
 * con revision/MFA elevados; el contrato aceptado de `tenants-update` no
 * declara `STEP_UP_OR_APPROVAL_REQUIRED`, por lo que este caso de uso no
 * consulta el puerto de step-up/aprobacion (nada se agrega por inferencia).
 */
export const TENANTS_UPDATE_ROLES: readonly AuthenticatedUser["role"][] = ["admin"];

export type TenantsUpdateActor = Pick<AuthenticatedUser, "id" | "role">;

/**
 * Precondicion deny-by-default del caso de uso.
 *
 * Devuelve `false` cuando no hay actor autenticado (invocacion fuera del
 * pipeline HTTP o sesion ausente) o el rol no esta autorizado para la
 * capacidad; el llamador responde 403 sin revelar existencia ni contenido del
 * registro.
 */
export function canUpdateTenants(actor: TenantsUpdateActor | null): boolean {
  return actor !== null && TENANTS_UPDATE_ROLES.includes(actor.role);
}

/**
 * Proyecta el usuario autenticado del transporte al actor del caso de uso.
 *
 * El controller es el unico punto que lee `request.user`; la capa de
 * aplicacion recibe un contrato nombrado y no depende de Express/Nest.
 */
export function toTenantsUpdateActor(
  user: AuthenticatedUser | undefined,
): TenantsUpdateActor | null {
  return user ? { id: user.id, role: user.role } : null;
}
