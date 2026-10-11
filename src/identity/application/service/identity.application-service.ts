import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { IDENTITY_USERS_SHOW_OPERATION } from "../constants/identity-users-show.constant";
import { IDENTITY_USERS_STORE_OPERATION } from "../constants/identity-users-store.constant";
import { IDENTITY_USERS_UPDATE_OPERATION } from "../constants/identity-users-update.constant";
import type { UsersShowParamsDto } from "../dtos/users-show.request.dto";
import type { UsersShowResponseDto } from "../dtos/users-show.response.dto";
import type { UsersStoreRequestDto } from "../dtos/users-store.request.dto";
import type { UsersStoreResponseDto } from "../dtos/users-store.response.dto";
import type { UsersUpdateParamsDto, UsersUpdateRequestDto } from "../dtos/users-update.request.dto";
import type { UsersUpdateResponseDto } from "../dtos/users-update.response.dto";
import { UserIdentityConflictError } from "../errors/user-identity-conflict.error";
import type { IIdentityUserRepository } from "../repositories/identity-user.repository.interface";
import { IDENTITY_USER_REPOSITORY } from "../repositories/identity-user.repository.token";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";
import { canShowUsers, type UsersShowActor } from "../security/users-show-capability";
import { canStoreUsers, type UsersStoreActor } from "../security/users-store-capability";
import { canUpdateUsers, type UsersUpdateActor } from "../security/users-update-capability";

@Injectable()
export class IdentityApplicationService {
  private readonly logger = new Logger(IdentityApplicationService.name);

  constructor(
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly repository: IIdentityUserRepository,
  ) {}

  /**
   * Recupera un usuario autorizado del tenant de confianza.
   *
   * Deny-by-default, en orden: capability `identity:users:show` (sin actor
   * autorizado -> 403 sin revelar existencia ni contenido) y contexto de
   * tenant de confianza (ausente -> 403 no disuasorio). La lectura se ejecuta
   * con el scope de tenant como argumento separado: la posesion del uuid
   * jamas otorga acceso y un identificador de otro tenant se resuelve `null`,
   * exactamente igual que una ausencia — la respuesta 404 no reveladora
   * (mismo mensaje para ambos casos) es responsabilidad de este service.
   *
   * Es una operacion de solo lectura: no abre una transaccion por una unica
   * lectura, no escribe estado canonico ni cache, y no produce un
   * efecto de negocio. Las repeticiones concurrentes son seguras y se
   * re-autorizan en cada ejecucion (jamas se cachea una decision de
   * autorizacion previa). La telemetria registra solo accion/resultado: ni
   * filas, ni email, ni payloads, ni el identificador consultado (PII).
   */
  async show(
    params: UsersShowParamsDto,
    actor: UsersShowActor | null,
    tenantContext: TrustedTenantContext | null,
  ): Promise<UsersShowResponseDto> {
    if (!canShowUsers(actor)) {
      this.logger.warn(
        { action: IDENTITY_USERS_SHOW_OPERATION, result: "forbidden" },
        "Users show denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!tenantContext) {
      this.logger.warn(
        { action: IDENTITY_USERS_SHOW_OPERATION, result: "tenant_context_missing" },
        "Users show denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    const user = await this.repository.show(params.userId, tenantContext);

    if (user === null) {
      this.logger.warn(
        { action: IDENTITY_USERS_SHOW_OPERATION, result: "not_found" },
        "Users show target not found",
      );

      throw new NotFoundException("El usuario solicitado no esta disponible");
    }

    this.logger.log({ action: IDENTITY_USERS_SHOW_OPERATION, result: "success" }, "Showed user");

    return { success: true, result: user };
  }

  /**
   * Crea atomicamente un usuario del tenant de confianza.
   *
   * Precondiciones fail-closed, en orden: capability `identity:users:store`
   * (sin actor autorizado -> 403 sin revelar contenido) y contexto de tenant
   * de confianza (ausente -> 403 no disuasorio). El `tenant_id` del usuario
   * creado proviene solo de ese contexto y viaja como argumento separado:
   * ningun valor del body amplia el alcance.
   *
   * La identidad de negocio durable es `(tenant, email)`: una repeticion
   * converge al mismo registro o al conflicto determinista
   * `BUSINESS_IDENTITY_CONFLICT` (409) traducido sin exponer el error del
   * driver; la telemetria jamas registra el email ni payloads (solo accion y
   * clase de resultado; el email es PII).
   *
   * GAP bloqueante (D2 + S6 + S2, decision/autorizacion humana pendiente): el
   * write set canonico exige persistir `user` + evidencia de auditoria
   * append-only en la misma transaccion, y el valor inicial de `status` no
   * esta confirmado por el owner; el adapter falla cerrado
   * (`IdentityStoreBlockedError`) y la operacion no debe activarse en runtime
   * hasta que esas precondiciones se resuelvan. Este service no simula el
   * resultado ni escribe la tabla de auditoria por su cuenta.
   */
  async store(
    body: UsersStoreRequestDto,
    actor: UsersStoreActor | null,
    tenantContext: TrustedTenantContext | null,
  ): Promise<UsersStoreResponseDto> {
    if (!canStoreUsers(actor)) {
      this.logger.warn(
        { action: IDENTITY_USERS_STORE_OPERATION, result: "forbidden" },
        "Users store denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!tenantContext) {
      this.logger.warn(
        { action: IDENTITY_USERS_STORE_OPERATION, result: "tenant_context_missing" },
        "Users store denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    try {
      const user = await this.repository.store(body, tenantContext);

      this.logger.log({ action: IDENTITY_USERS_STORE_OPERATION, result: "success" }, "Stored user");

      return { success: true, result: user, version: user.version };
    } catch (error) {
      if (error instanceof UserIdentityConflictError) {
        this.logger.warn(
          { action: IDENTITY_USERS_STORE_OPERATION, result: "conflict" },
          "User business identity conflict",
        );

        throw new ConflictException("Ya existe un usuario con ese email en el tenant");
      }

      throw error;
    }
  }

  /**
   * Edita los campos mutables del usuario del tenant de confianza con
   * concurrencia optimista.
   *
   * Precondiciones fail-closed, en orden: capability `identity:users:update`
   * (sin actor autorizado -> 403 sin revelar existencia ni contenido) y
   * contexto de tenant de confianza (ausente -> 403 no disuasorio). El
   * `tenant_id` del usuario editado proviene solo de ese contexto y viaja como
   * argumento separado: ningun valor del body amplia el alcance.
   *
   * La edicion es un compare-and-write sobre `expected_version` y su resultado
   * tipado se traduce al contrato canonico: inexistente o de otro tenant ->
   * 404 no revelador (mismo mensaje para ambos casos); version desactualizada
   * -> 409 `STALE_VERSION` sin last-write-wins. Los fallos de dependencia/infra
   * suben al boundary global como error interno seguro: ningun error del
   * driver cruza esta capa. La telemetria registra solo accion y clase de
   * resultado; jamas filas, email, payloads ni el identificador editado (PII).
   *
   * D3 (confirmacion humana pendiente): el contrato aceptado no declara
   * step-up/aprobacion para esta operacion y nada se agrega por inferencia; la
   * determinacion literal se implementa y la confirmacion del owner precede a
   * la activacion.
   *
   * GAP bloqueante (S6, autorizacion humana pendiente): el write set canonico
   * exige ademas la evidencia de auditoria append-only en la misma
   * transaccion, a traves de la interfaz publica del modulo `audit` — que hoy
   * solo expone lectura (`apps/bus-impl-v2/src/audit/**` esta fuera de
   * `allowed_paths`). Hasta que esa interfaz exista y D1 este confirmado, esta
   * operacion no satisface el write set atomico completo y no debe activarse
   * en runtime: no se escribe la tabla ajena ni se simula la evidencia. Cuando
   * S6 llegue, la frontera de transaccion se mueve a este service para que la
   * fila y la evidencia de auditoria commiteen atomicamente.
   */
  async update(
    params: UsersUpdateParamsDto,
    body: UsersUpdateRequestDto,
    actor: UsersUpdateActor | null,
    tenantContext: TrustedTenantContext | null,
  ): Promise<UsersUpdateResponseDto> {
    if (!canUpdateUsers(actor)) {
      this.logger.warn(
        { action: IDENTITY_USERS_UPDATE_OPERATION, result: "forbidden" },
        "Users update denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!tenantContext) {
      this.logger.warn(
        { action: IDENTITY_USERS_UPDATE_OPERATION, result: "tenant_context_missing" },
        "Users update denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    const result = await this.repository.update(
      {
        expectedVersion: body.expected_version,
        ...(body.display_name === undefined ? {} : { displayName: body.display_name }),
        ...(body.role_ids === undefined ? {} : { roleIds: body.role_ids }),
        userId: params.userId,
      },
      tenantContext,
    );

    if (result.outcome === "not_found") {
      this.logger.warn(
        { action: IDENTITY_USERS_UPDATE_OPERATION, result: "not_found" },
        "Users update target not found",
      );

      throw new NotFoundException("El usuario solicitado no esta disponible");
    }

    if (result.outcome === "stale") {
      this.logger.warn(
        { action: IDENTITY_USERS_UPDATE_OPERATION, result: "conflict" },
        "Users update rejected by version guard",
      );

      throw new ConflictException(
        "La version esperada ya no es la vigente; consulta el estado autoritativo antes de reintentar",
      );
    }

    this.logger.log({ action: IDENTITY_USERS_UPDATE_OPERATION, result: "success" }, "Updated user");

    return {
      success: true,
      result: result.user,
      version: result.user.version,
    };
  }
}
