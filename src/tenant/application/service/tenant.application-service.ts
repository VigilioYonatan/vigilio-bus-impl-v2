import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { TenantsIndexQueryDto } from "../dtos/tenants-index.request.dto";
import type { TenantsIndexResponseDto } from "../dtos/tenants-index.response.dto";
import type { TenantsShowParamsDto } from "../dtos/tenants-show.request.dto";
import type { TenantsShowResponseDto } from "../dtos/tenants-show.response.dto";
import type { TenantsStoreRequestDto } from "../dtos/tenants-store.request.dto";
import type { TenantsStoreResponseDto } from "../dtos/tenants-store.response.dto";
import type {
  TenantsSuspendParamsDto,
  TenantsSuspendRequestDto,
} from "../dtos/tenants-suspend.request.dto";
import type { TenantsSuspendResponseDto } from "../dtos/tenants-suspend.response.dto";
import type {
  TenantsUpdateParamsDto,
  TenantsUpdateRequestDto,
} from "../dtos/tenants-update.request.dto";
import type { TenantsUpdateResponseDto } from "../dtos/tenants-update.response.dto";
import { TenantIdentityConflictError } from "../errors/tenant-identity-conflict.error";
import type { ITenantRepository } from "../repositories/tenant.repository.interface";
import { TENANT_REPOSITORY } from "../repositories/tenant.repository.token";
import { tenantsSuspendStepUpApprovalRequired } from "../schemas/tenants-suspend.schema";
import {
  isStepUpApprovalSatisfied,
  type StepUpApprovalContext,
} from "../security/step-up-approval-context";
import { canIndexTenants, type TenantsIndexActor } from "../security/tenants-index-capability";
import { canShowTenants, type TenantsShowActor } from "../security/tenants-show-capability";
import { canStoreTenants, type TenantsStoreActor } from "../security/tenants-store-capability";
import {
  canSuspendTenants,
  type TenantsSuspendActor,
} from "../security/tenants-suspend-capability";
import { canUpdateTenants, type TenantsUpdateActor } from "../security/tenants-update-capability";

@Injectable()
export class TenantApplicationService {
  private readonly logger = new Logger(TenantApplicationService.name);

  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly repository: ITenantRepository,
  ) {}

  /**
   * Lista tenants autorizados del registro global.
   *
   * Deny-by-default: `tenant:tenants:index` es una operacion de administracion
   * global; sin actor autorizado se responde 403 sin revelar existencia ni
   * contenido del registro. La operacion es de solo lectura: no escribe estado
   * canonico y una repeticion no duplica efectos.
   */
  async index(
    query: TenantsIndexQueryDto,
    actor: TenantsIndexActor | null,
  ): Promise<TenantsIndexResponseDto> {
    if (!canIndexTenants(actor)) {
      this.logger.warn(
        { action: "tenant.tenants-index", result: "forbidden" },
        "Tenants index denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    const response = await this.repository.index(query);

    this.logger.log(
      { action: "tenant.tenants-index", count: response.count, result: "success" },
      "Listed tenants",
    );

    return response;
  }

  /**
   * Recupera un tenant autorizado del registro global.
   *
   * Deny-by-default: `tenant:tenants:show` es una lectura privilegiada de
   * administracion global; sin actor autorizado se responde 403 sin revelar
   * existencia ni contenido del registro. El identificador inexistente se
   * responde 404 dentro del alcance autorizado sin filtrar estado ajeno (la
   * posesion del uuid jamas otorga acceso). La operacion es de solo lectura:
   * no abre una transaccion por una unica lectura, no escribe estado canonico,
   * no escribe cache y no produce un efecto de negocio; las repeticiones
   * concurrentes son seguras y se re-autorizan en cada ejecucion.
   *
   * D1 (decision humana pendiente): la semantica de auditoria de lecturas
   * privilegiadas no esta confirmada; la instrumentacion se limita a
   * telemetria con correlacion (accion/resultado), sin PII ni texto libre, y
   * jamas se improvisa un tercer camino de auditoria ni se escribe la tabla
   * ajena (S6, autorizacion humana pendiente).
   */
  async show(
    params: TenantsShowParamsDto,
    actor: TenantsShowActor | null,
  ): Promise<TenantsShowResponseDto> {
    if (!canShowTenants(actor)) {
      this.logger.warn(
        { action: "tenant.tenants-show", result: "forbidden" },
        "Tenant show denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    const tenant = await this.repository.show(params.tenantId);

    if (tenant === null) {
      this.logger.warn(
        { action: "tenant.tenants-show", result: "not_found" },
        "Tenant show target not found",
      );

      throw new NotFoundException("El tenant solicitado no esta disponible");
    }

    this.logger.log({ action: "tenant.tenants-show", result: "success" }, "Showed tenant");

    return {
      success: true,
      result: tenant,
    };
  }

  /**
   * Crea atomico un tenant del registro global.
   *
   * Deny-by-default: `tenant:tenants:store` es una mutacion privilegiada de
   * administracion global; sin actor autorizado se responde 403 sin revelar
   * contenido. La identidad de negocio durable es `slug` (unico global): la
   * violacion del constraint se traduce al resultado canonico
   * `BUSINESS_IDENTITY_CONFLICT` (409) sin exponer el error del driver, y una
   * repeticion converge al mismo resultado durable o al conflicto
   * deterministico, sin duplicar el efecto logico.
   *
   * GAP bloqueante (S6, autorizacion humana pendiente): el write set canonico
   * exige ademas la evidencia de auditoria append-only en la misma
   * transaccion, escrita a traves de la interfaz publica del modulo `audit`
   * — que hoy solo expone lectura (`apps/bus-impl-v2/src/audit/**` esta fuera
   * de `allowed_paths`). Hasta que esa interfaz exista y D1 este confirmado,
   * esta operacion no satisface el write set atomico completo y no debe
   * activarse en runtime: no se escribe la tabla ajena ni se simula la
   * evidencia.
   */
  async store(
    body: TenantsStoreRequestDto,
    actor: TenantsStoreActor | null,
  ): Promise<TenantsStoreResponseDto> {
    if (!canStoreTenants(actor)) {
      this.logger.warn(
        { action: "tenant.tenants-store", result: "forbidden" },
        "Tenants store denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    try {
      const tenant = await this.repository.store(body);

      this.logger.log({ action: "tenant.tenants-store", result: "success" }, "Stored tenant");

      return {
        success: true,
        result: tenant,
        version: tenant.version,
      };
    } catch (error) {
      if (error instanceof TenantIdentityConflictError) {
        this.logger.warn(
          { action: "tenant.tenants-store", result: "conflict" },
          "Tenant business identity conflict",
        );

        throw new ConflictException("Ya existe un tenant con esa identidad");
      }

      throw error;
    }
  }

  /**
   * Edita los campos mutables del registro global con concurrencia optimista.
   *
   * Precondicion deny-by-default: `tenant:tenants:update` es una mutacion
   * privilegiada de administracion global; sin actor autorizado se responde 403
   * sin revelar existencia ni contenido del registro. El contrato aceptado no
   * declara step-up/aprobacion para esta operacion (Q-010 clasifica
   * suspension/reactivacion, no la edicion del registro): no se consulta el
   * puerto de step-up y nada se agrega por inferencia.
   *
   * La edicion es un compare-and-write sobre `expected_version` y su resultado
   * tipado se traduce al contrato canonico: inexistente → 404 no revelador;
   * version desactualizada → 409 `STALE_VERSION` sin last-write-wins. Los
   * fallos de dependencia/infra suben al boundary global como error interno
   * seguro: ningun error del driver cruza esta capa. La telemetria registra
   * solo accion, correlacion y clase de resultado; el payload jamas se registra.
   *
   * GAP bloqueante (S6, autorizacion humana pendiente): el write set canonico
   * exige ademas la evidencia de auditoria append-only en la misma transaccion,
   * a traves de la interfaz publica del modulo `audit` — que hoy solo expone
   * lectura (`apps/bus-impl-v2/src/audit/**` esta fuera de `allowed_paths`).
   * Hasta que esa interfaz exista y D1 este confirmado, esta operacion no
   * satisface el write set atomico completo y no debe activarse en runtime: no
   * se escribe la tabla ajena ni se simula la evidencia.
   */
  async update(
    params: TenantsUpdateParamsDto,
    body: TenantsUpdateRequestDto,
    actor: TenantsUpdateActor | null,
    correlationId: string | null,
  ): Promise<TenantsUpdateResponseDto> {
    if (!canUpdateTenants(actor)) {
      this.logger.warn(
        { action: "tenant.tenants-update", correlation_id: correlationId, result: "forbidden" },
        "Tenants update denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    const result = await this.repository.update({
      expectedVersion: body.expected_version,
      ...(body.name === undefined ? {} : { name: body.name }),
      tenantId: params.tenantId,
    });

    if (result.outcome === "not_found") {
      this.logger.warn(
        { action: "tenant.tenants-update", correlation_id: correlationId, result: "not_found" },
        "Tenants update target not found",
      );

      throw new NotFoundException("El tenant solicitado no esta disponible");
    }

    if (result.outcome === "stale") {
      this.logger.warn(
        { action: "tenant.tenants-update", correlation_id: correlationId, result: "conflict" },
        "Tenants update rejected by version guard",
      );

      throw new ConflictException(
        "La version esperada ya no es la vigente; consulta el estado autoritativo antes de reintentar",
      );
    }

    this.logger.log(
      { action: "tenant.tenants-update", correlation_id: correlationId, result: "success" },
      "Updated tenant",
    );

    return {
      success: true,
      result: result.tenant,
      version: result.tenant.version,
    };
  }

  /**
   * Suspende un tenant del registro global (fail-closed para nuevas
   * mutaciones).
   *
   * Precondiciones fail-closed, en orden:
   * 1. capability `tenant:suspend:tenant` (sin actor autorizado -> 403 no
   *    revelador);
   * 2. step-up/aprobacion no verificable -> 403
   *    `STEP_UP_OR_APPROVAL_REQUIRED` (Q-010; GAP-10 hasta que
   *    `identity`/`security` materialicen el mecanismo; jamas fail-open).
   *
   * La transicion ocurre por compare-and-write sobre `expected_version` +
   * estado `ACTIVE` y su resultado tipado se traduce al contrato canonico:
   * inexistente -> 404 no revelador; version desactualizada o estado no
   * suspendible -> 409 sin last-write-wins. Los fallos de dependencia/infra
   * suben al boundary global como error interno seguro: ningun error del
   * driver cruza esta capa. La telemetria registra solo accion, correlacion y
   * clase de resultado; `reason` es la justificacion gobernada y nunca se
   * registra.
   *
   * GAP bloqueante (S6, autorizacion humana pendiente): el write set canonico
   * exige ademas la evidencia de auditoria append-only y el outbox row de
   * `TenantSuspended.v1` en la misma transaccion, a traves de las superficies
   * publicas del modulo `audit` (hoy solo expone lectura; fuera de
   * `allowed_paths`). Hasta que existan y D1 este confirmado, esta operacion no
   * satisface el write set atomico completo y no debe activarse en runtime: no
   * se escribe la tabla ajena, no se publica directamente (ADR-003) ni se
   * simula la evidencia.
   */
  async suspend(
    params: TenantsSuspendParamsDto,
    body: TenantsSuspendRequestDto,
    actor: TenantsSuspendActor | null,
    stepUpApproval: StepUpApprovalContext | null,
    correlationId: string | null,
  ): Promise<TenantsSuspendResponseDto> {
    if (!canSuspendTenants(actor)) {
      this.logger.warn(
        { action: "tenant.suspend-tenant", correlation_id: correlationId, result: "forbidden" },
        "Tenant suspend denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!isStepUpApprovalSatisfied(stepUpApproval)) {
      this.logger.warn(
        {
          action: "tenant.suspend-tenant",
          correlation_id: correlationId,
          result: "step_up_or_approval_required",
        },
        "Tenant suspend denied pending step-up or approval",
      );

      throw new ForbiddenException(tenantsSuspendStepUpApprovalRequired);
    }

    const result = await this.repository.suspend({
      expectedVersion: body.expected_version,
      reason: body.reason,
      tenantId: params.tenantId,
    });

    if (result.outcome === "not_found") {
      this.logger.warn(
        { action: "tenant.suspend-tenant", correlation_id: correlationId, result: "not_found" },
        "Tenant suspend target not found",
      );

      throw new NotFoundException("El tenant solicitado no esta disponible");
    }

    if (result.outcome === "stale") {
      this.logger.warn(
        { action: "tenant.suspend-tenant", correlation_id: correlationId, result: "conflict" },
        "Tenant suspend rejected by version/state guard",
      );

      throw new ConflictException(
        "La version esperada ya no es la vigente o el estado actual no permite suspender; consulta el estado autoritativo antes de reintentar",
      );
    }

    this.logger.log(
      { action: "tenant.suspend-tenant", correlation_id: correlationId, result: "success" },
      "Suspended tenant",
    );

    return {
      success: true,
      result: result.tenant,
      version: result.tenant.version,
    };
  }
}
