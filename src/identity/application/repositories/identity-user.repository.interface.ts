import type { UsersStoreRequestDto } from "../dtos/users-store.request.dto";
import type { IdentityUserSchema } from "../schemas/identity-user.schema";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";

/**
 * Entrada de la edicion `update`.
 *
 * El request ya esta validado por el contrato; `userId` llega resuelto por el
 * router, `expectedVersion` es el detector durable de escrituras obsoletas y
 * los campos mutables son opcionales: su ausencia conserva el valor vigente y
 * el compare-and-write se ejecuta igualmente (contrato aceptado, sin
 * validaciones adicionales).
 */
export type IdentityUserUpdateInput = {
  expectedVersion: number;
  displayName?: string;
  roleIds?: string[];
  userId: string;
};

/**
 * Resultado tipado del compare-and-write de edicion.
 *
 * - `updated`: la fila cumplia tenant + `version = expected_version` y la
 *   proyeccion devuelta es el estado confirmado post-commit (`version`
 *   incrementada, `updated_at` avanzado).
 * - `not_found`: no existe el usuario solicitado dentro del tenant de
 *   confianza (respuesta no reveladora: un identificador de otro tenant es
 *   indistinguible de una ausencia).
 * - `stale`: la fila existe en el tenant pero la version esperada ya no es la
 *   vigente (conflicto canonico 409; jamas last-write-wins). La clasificacion
 *   no agrega una precondicion de `status`: el contrato aceptado no declara un
 *   estado-error y las transiciones de ciclo de vida pertenecen a
 *   `disable-user` (lectura literal del contrato).
 */
export type IdentityUserUpdateResult =
  | { outcome: "updated"; user: IdentityUserSchema }
  | { outcome: "not_found" }
  | { outcome: "stale" };

/**
 * Puerto del agregado `user` del contexto `identity`.
 *
 * Expone solo las operaciones purpose-specific que los casos de uso
 * necesitan, con el scope de tenant como argumento obligatorio y separado
 * para que ningun valor de la request pueda ampliarlo; no existe una
 * superficie generica de lectura/escritura que permita saltarse invariantes
 * del modelo. Para el alta, la identidad durable es `(tenant_id, email)` y la
 * base de datos es el guard final de carreras; para la edicion, el detector
 * durable de escrituras obsoletas es `version` (compare-and-write).
 */
export interface IIdentityUserRepository {
  /**
   * Lectura puntual tenant-scoped del agregado por identidad inmutable.
   *
   * El predicado de tenant es obligatorio y viaja como argumento separado
   * (jamas desde path/query/body): un identificador de otro tenant se
   * resuelve `null`, indistinguible de una ausencia, y la clasificacion 404
   * no reveladora pertenece al service. La proyeccion expuesta es solo la
   * publica del contrato; no hay filas completas ni columnas internas.
   */
  show(userId: string, tenantContext: TrustedTenantContext): Promise<IdentityUserSchema | null>;
  store(
    input: UsersStoreRequestDto,
    tenantContext: TrustedTenantContext,
  ): Promise<IdentityUserSchema>;
  /**
   * Edicion tenant-scoped de los campos mutables con concurrencia optimista.
   *
   * El compare-and-write incluye identidad + tenant + `version` esperada; la
   * base de datos es el guard final de carreras y una version obsoleta jamas
   * sobrescribe una mas nueva. El scope de tenant viaja como argumento
   * separado obligatorio y participa tambien de la clasificacion de cero
   * filas: solo una fila vigente del mismo tenant produce `stale`; un
   * identificador ausente o de otro tenant produce `not_found` sin revelar
   * existencia.
   */
  update(
    input: IdentityUserUpdateInput,
    tenantContext: TrustedTenantContext,
  ): Promise<IdentityUserUpdateResult>;
}
