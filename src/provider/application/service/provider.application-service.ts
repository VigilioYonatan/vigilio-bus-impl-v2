import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PROVIDER_DISABLE_PROVIDER_OPERATION } from "../constants/disable-provider.constant";
import { PROVIDER_NORMALIZATION_MAPPINGS_STORE_OPERATION } from "../constants/normalization-mappings-store.constant";
import { PROVIDER_ACCOUNTS_STORE_OPERATION } from "../constants/provider-accounts-store.constant";
import { PROVIDER_PROVIDERS_INDEX_OPERATION } from "../constants/providers-index.constant";
import { PROVIDER_PROVIDERS_STORE_OPERATION } from "../constants/providers-store.constant";
import type {
  DisableProviderParamsDto,
  DisableProviderRequestDto,
} from "../dtos/disable-provider.request.dto";
import type { DisableProviderResponseDto } from "../dtos/disable-provider.response.dto";
import type { NormalizationMappingsStoreRequestDto } from "../dtos/normalization-mappings-store.request.dto";
import type { NormalizationMappingsStoreResponseDto } from "../dtos/normalization-mappings-store.response.dto";
import type { ProviderAccountsStoreRequestDto } from "../dtos/provider-accounts-store.request.dto";
import type { ProviderAccountsStoreResponseDto } from "../dtos/provider-accounts-store.response.dto";
import type { ProvidersIndexQueryDto } from "../dtos/providers-index.request.dto";
import type { ProvidersIndexResponseDto } from "../dtos/providers-index.response.dto";
import type { ProvidersStoreRequestDto } from "../dtos/providers-store.request.dto";
import type { ProvidersStoreResponseDto } from "../dtos/providers-store.response.dto";
import { NormalizationMappingIdentityConflictError } from "../errors/normalization-mapping-identity-conflict.error";
import { ProviderAccountIdentityConflictError } from "../errors/provider-account-identity-conflict.error";
import { ProviderIdentityConflictError } from "../errors/provider-identity-conflict.error";
import type { INormalizationMappingRepository } from "../repositories/normalization-mapping.repository.interface";
import { NORMALIZATION_MAPPING_REPOSITORY } from "../repositories/normalization-mapping.repository.token";
import type { IProviderRepository } from "../repositories/provider.repository.interface";
import { PROVIDER_REPOSITORY } from "../repositories/provider.repository.token";
import type { IProviderAccountRepository } from "../repositories/provider-account.repository.interface";
import { PROVIDER_ACCOUNT_REPOSITORY } from "../repositories/provider-account.repository.token";
import {
  canDisableProvider,
  type DisableProviderActor,
} from "../security/disable-provider-capability";
import {
  canStoreNormalizationMappings,
  type NormalizationMappingsStoreActor,
} from "../security/normalization-mappings-store-capability";
import {
  canStoreProviderAccounts,
  type ProviderAccountsStoreActor,
} from "../security/provider-accounts-store-capability";
import {
  canIndexProviders,
  type ProvidersIndexActor,
} from "../security/providers-index-capability";
import {
  canStoreProviders,
  type ProvidersStoreActor,
} from "../security/providers-store-capability";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";

@Injectable()
export class ProviderApplicationService {
  private readonly logger = new Logger(ProviderApplicationService.name);

  constructor(
    @Inject(PROVIDER_REPOSITORY)
    private readonly repository: IProviderRepository,
    @Inject(NORMALIZATION_MAPPING_REPOSITORY)
    private readonly normalizationMappingRepository: INormalizationMappingRepository,
    @Inject(PROVIDER_ACCOUNT_REPOSITORY)
    private readonly providerAccountRepository: IProviderAccountRepository,
  ) {}

  /**
   * Lista providers autorizados del tenant de confianza.
   *
   * Precondiciones fail-closed, en orden: capability `provider:providers:index`
   * (sin actor autorizado -> 403 sin revelar contenido) y contexto de tenant
   * de confianza (ausente -> 403 no disuasorio). El alcance del listado se
   * resuelve exclusivamente desde ese contexto y viaja como argumento
   * separado al puerto: ningun valor de la query amplia el tenant ni actua
   * como alias de `tenant_id`.
   *
   * La operacion es de solo lectura: no abre una transaccion, no escribe
   * estado canonico, no escribe cache ni auditoria (el owner canonico no
   * asigna una fila de auditoria de lectura privilegiada a este caso de uso),
   * y una repeticion concurrente es segura — cada ejecucion se re-autoriza y
   * una lectura nunca se trata como snapshot de autorizacion. La telemetria
   * registra solo accion, clase de resultado y el conteo autorizado; `search`
   * y los valores crudos jamas se registran.
   */
  async index(
    query: ProvidersIndexQueryDto,
    actor: ProvidersIndexActor | null,
    tenantContext: TrustedTenantContext | null,
  ): Promise<ProvidersIndexResponseDto> {
    if (!canIndexProviders(actor)) {
      this.logger.warn(
        { action: PROVIDER_PROVIDERS_INDEX_OPERATION, result: "forbidden" },
        "Providers index denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!tenantContext) {
      this.logger.warn(
        { action: PROVIDER_PROVIDERS_INDEX_OPERATION, result: "tenant_context_missing" },
        "Providers index denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    const response = await this.repository.index(query, tenantContext);

    this.logger.log(
      { action: PROVIDER_PROVIDERS_INDEX_OPERATION, count: response.count, result: "success" },
      "Listed providers",
    );

    return response;
  }

  /**
   * Crea atomicamente un provider del tenant de confianza.
   *
   * Precondiciones fail-closed, en orden: capability `provider:providers:store`
   * (sin actor autorizado -> 403 sin revelar contenido) y contexto de tenant
   * de confianza (ausente -> 403 no disuasorio). El `tenant_id` del provider
   * creado proviene solo de ese contexto y viaja como argumento separado:
   * ningun valor del body amplia el alcance.
   *
   * La identidad de negocio durable es `(tenant, code)`: una repeticion
   * converge al mismo registro o al conflicto determinista
   * `BUSINESS_IDENTITY_CONFLICT` (409) traducido sin exponer el error del
   * driver; la telemetria jamas registra payloads (solo accion y clase de
   * resultado).
   *
   * GAP bloqueante (D1 + S6 + S2, decision/autorizacion humana pendiente): el
   * write set canonico exige persistir `provider` + evidencia de auditoria
   * append-only en la misma transaccion, y el valor inicial de `status` no
   * esta confirmado por el owner; el adapter falla cerrado
   * (`ProviderStoreBlockedError`) y la operacion no debe activarse en runtime
   * hasta que esas precondiciones se resuelvan. Este service no simula el
   * resultado ni escribe la tabla de auditoria por su cuenta.
   */
  async store(
    body: ProvidersStoreRequestDto,
    actor: ProvidersStoreActor | null,
    tenantContext: TrustedTenantContext | null,
  ): Promise<ProvidersStoreResponseDto> {
    if (!canStoreProviders(actor)) {
      this.logger.warn(
        { action: PROVIDER_PROVIDERS_STORE_OPERATION, result: "forbidden" },
        "Providers store denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!tenantContext) {
      this.logger.warn(
        { action: PROVIDER_PROVIDERS_STORE_OPERATION, result: "tenant_context_missing" },
        "Providers store denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    try {
      const provider = await this.repository.store(body, tenantContext);

      this.logger.log(
        { action: PROVIDER_PROVIDERS_STORE_OPERATION, result: "success" },
        "Stored provider",
      );

      return { success: true, result: provider, version: provider.version };
    } catch (error) {
      if (error instanceof ProviderIdentityConflictError) {
        this.logger.warn(
          { action: PROVIDER_PROVIDERS_STORE_OPERATION, result: "conflict" },
          "Provider business identity conflict",
        );

        throw new ConflictException("Ya existe un proveedor con ese código dentro del tenant");
      }

      throw error;
    }
  }

  /**
   * Deshabilita un provider del tenant de confianza (sin eliminar historial).
   *
   * Precondiciones fail-closed, en orden: capability `provider:disable:provider`
   * (sin actor autorizado -> 403 sin revelar contenido) y contexto de tenant
   * de confianza (ausente -> 403 no disuasorio). La transicion ocurre por
   * compare-and-write sobre `(tenant de confianza, providerId,
   * expected_version)` + el state guard `status = 'ACTIVE'` (la unica
   * transicion aceptada por el catalogo) y su resultado tipado se traduce al
   * contrato canonico: inexistente -> 404 no revelador; version desactualizada
   * o estado no deshabilitable -> 409 sin last-write-wins. No se agrega
   * step-up/aprobacion ni idempotency key: el contrato aceptado no los declara
   * y nada se introduce por inferencia. La telemetria registra solo accion,
   * correlacion y clase de resultado; `reason` es la justificacion gobernada y
   * nunca se registra.
   *
   * GAP bloqueante (S6/S2, autorizacion humana pendiente): el write set
   * canonico exige ademas la evidencia de auditoria append-only en la misma
   * transaccion, a traves de la interfaz publica del modulo `audit` (hoy solo
   * expone lectura; fuera de `allowed_paths`), y la migracion versionada aun no
   * materializa `providers`. Hasta que existan, el adapter falla cerrado
   * (`ProviderDisableBlockedError`) y la operacion no debe activarse en
   * runtime: este service no simula el resultado ni escribe la tabla ajena.
   */
  async disable(
    params: DisableProviderParamsDto,
    body: DisableProviderRequestDto,
    actor: DisableProviderActor | null,
    tenantContext: TrustedTenantContext | null,
    correlationId: string | null,
  ): Promise<DisableProviderResponseDto> {
    if (!canDisableProvider(actor)) {
      this.logger.warn(
        {
          action: PROVIDER_DISABLE_PROVIDER_OPERATION,
          correlation_id: correlationId,
          result: "forbidden",
        },
        "Provider disable denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!tenantContext) {
      this.logger.warn(
        {
          action: PROVIDER_DISABLE_PROVIDER_OPERATION,
          correlation_id: correlationId,
          result: "tenant_context_missing",
        },
        "Provider disable denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    const result = await this.repository.disable(
      { expectedVersion: body.expected_version, providerId: params.providerId },
      tenantContext,
    );

    if (result.outcome === "not_found") {
      this.logger.warn(
        {
          action: PROVIDER_DISABLE_PROVIDER_OPERATION,
          correlation_id: correlationId,
          result: "not_found",
        },
        "Provider disable target not found",
      );

      throw new NotFoundException("El provider solicitado no esta disponible");
    }

    if (result.outcome === "stale") {
      this.logger.warn(
        {
          action: PROVIDER_DISABLE_PROVIDER_OPERATION,
          correlation_id: correlationId,
          result: "conflict",
        },
        "Provider disable rejected by version/state guard",
      );

      throw new ConflictException(
        "La version esperada ya no es la vigente o el estado actual no permite deshabilitar; consulta el estado autoritativo antes de reintentar",
      );
    }

    this.logger.log(
      {
        action: PROVIDER_DISABLE_PROVIDER_OPERATION,
        correlation_id: correlationId,
        result: "success",
      },
      "Disabled provider",
    );

    return {
      success: true,
      result: result.provider,
      version: result.provider.version,
    };
  }

  /**
   * Crea atomicamente un mapeo de normalizacion del tenant de confianza.
   *
   * Precondiciones fail-closed, en orden: capability
   * `provider:normalization:mappings:store` (sin actor autorizado -> 403 sin
   * revelar contenido) y contexto de tenant de confianza (ausente -> 403 no
   * disuasorio). El `tenant_id` del mapeo creado proviene solo de ese contexto
   * y viaja como argumento separado: ningun valor del body amplia el alcance.
   * La referencia `provider_id` debe pertenecer al tenant de confianza: el
   * adapter la valida dentro de la misma operacion y un resultado
   * `provider_not_found` se traduce a 403 no revelador
   * (`TENANT_SCOPE_VIOLATION`) sin distinguir si el provider existe en otro
   * tenant.
   *
   * La identidad de negocio durable es local al tenant (D2): una repeticion
   * converge al mismo registro o al conflicto determinista
   * `BUSINESS_IDENTITY_CONFLICT` (409) traducido sin exponer el error del
   * driver; la telemetria registra solo accion, correlacion y clase de
   * resultado (jamas los campos del mapeo).
   *
   * GAP bloqueante (D2/D3 + S6 + S2, decision/autorizacion humana pendiente):
   * el write set canonico exige persistir `normalization_mapping` + evidencia
   * de auditoria append-only en la misma transaccion, y la identidad/el valor
   * inicial de `status` no estan confirmados por el owner; el adapter falla
   * cerrado (`NormalizationMappingStoreBlockedError`) y la operacion no debe
   * activarse en runtime hasta que esas precondiciones se resuelvan. Este
   * service no simula el resultado ni escribe la tabla de auditoria por su
   * cuenta.
   */
  async storeNormalizationMapping(
    body: NormalizationMappingsStoreRequestDto,
    actor: NormalizationMappingsStoreActor | null,
    tenantContext: TrustedTenantContext | null,
    correlationId: string | null,
  ): Promise<NormalizationMappingsStoreResponseDto> {
    if (!canStoreNormalizationMappings(actor)) {
      this.logger.warn(
        {
          action: PROVIDER_NORMALIZATION_MAPPINGS_STORE_OPERATION,
          correlation_id: correlationId,
          result: "forbidden",
        },
        "Normalization mapping store denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!tenantContext) {
      this.logger.warn(
        {
          action: PROVIDER_NORMALIZATION_MAPPINGS_STORE_OPERATION,
          correlation_id: correlationId,
          result: "tenant_context_missing",
        },
        "Normalization mapping store denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    try {
      const result = await this.normalizationMappingRepository.store(body, tenantContext);

      if (result.outcome === "provider_not_found") {
        this.logger.warn(
          {
            action: PROVIDER_NORMALIZATION_MAPPINGS_STORE_OPERATION,
            correlation_id: correlationId,
            result: "tenant_scope_violation",
          },
          "Normalization mapping store rejected without disclosing provider existence",
        );

        throw new ForbiddenException("No autorizado para crear este mapeo de normalizacion");
      }

      this.logger.log(
        {
          action: PROVIDER_NORMALIZATION_MAPPINGS_STORE_OPERATION,
          correlation_id: correlationId,
          result: "success",
        },
        "Stored normalization mapping",
      );

      return { success: true, result: result.mapping, version: result.mapping.version };
    } catch (error) {
      if (error instanceof NormalizationMappingIdentityConflictError) {
        this.logger.warn(
          {
            action: PROVIDER_NORMALIZATION_MAPPINGS_STORE_OPERATION,
            correlation_id: correlationId,
            result: "conflict",
          },
          "Normalization mapping business identity conflict",
        );

        throw new ConflictException(
          "Ya existe un mapeo de normalizacion para ese par de origen dentro del tenant autorizado",
        );
      }

      throw error;
    }
  }

  /**
   * Crea atomicamente una cuenta de proveedor del tenant de confianza.
   *
   * Precondiciones fail-closed, en orden: capability
   * `provider:provider:accounts:store` (sin actor autorizado -> 403 sin
   * revelar contenido) y contexto de tenant de confianza (ausente -> 403 no
   * disuasorio). El `tenant_id` de la cuenta creada proviene solo de ese
   * contexto y viaja como argumento separado: ningun valor del body amplia el
   * alcance. La referencia `provider_id` debe pertenecer al tenant de
   * confianza: el adapter la valida dentro de la misma operacion y un
   * resultado `provider_not_found` se traduce a 403 no revelador
   * (`TENANT_SCOPE_VIOLATION`) sin distinguir si el provider existe en otro
   * tenant (el contrato aceptado no declara 404 para esta operacion).
   * `currency` es texto ISO-4217 exacto que viaja sin recalculo y
   * `secret_ref` es una referencia opaca que jamas se resuelve ni se registra.
   *
   * La identidad de negocio durable es local al tenant (D4, pendiente): una
   * repeticion convergera al mismo registro o al conflicto determinista
   * `BUSINESS_IDENTITY_CONFLICT` (409) traducido sin exponer el error del
   * driver; la telemetria registra solo accion, correlacion y clase de
   * resultado (jamas los campos de la cuenta).
   *
   * GAP bloqueante (D4/D5/D6 + S6 + S2, decision/autorizacion humana
   * pendiente): el write set canonico exige persistir `provider_account` +
   * evidencia de auditoria append-only en la misma transaccion, la
   * identidad/el valor inicial de `status`/la exposicion de `secret_ref` no
   * estan confirmados por el owner; el adapter falla cerrado
   * (`ProviderAccountStoreBlockedError`) y la operacion no debe activarse en
   * runtime hasta que esas precondiciones se resuelvan. Este service no
   * simula el resultado ni escribe la tabla de auditoria por su cuenta.
   */
  async storeProviderAccount(
    body: ProviderAccountsStoreRequestDto,
    actor: ProviderAccountsStoreActor | null,
    tenantContext: TrustedTenantContext | null,
    correlationId: string | null,
  ): Promise<ProviderAccountsStoreResponseDto> {
    if (!canStoreProviderAccounts(actor)) {
      this.logger.warn(
        {
          action: PROVIDER_ACCOUNTS_STORE_OPERATION,
          correlation_id: correlationId,
          result: "forbidden",
        },
        "Provider account store denied for unauthorized actor",
      );

      throw new ForbiddenException("No tienes permisos para esta operacion");
    }

    if (!tenantContext) {
      this.logger.warn(
        {
          action: PROVIDER_ACCOUNTS_STORE_OPERATION,
          correlation_id: correlationId,
          result: "tenant_context_missing",
        },
        "Provider account store denied without trusted tenant context",
      );

      throw new ForbiddenException("Contexto de tenant de confianza requerido");
    }

    try {
      const result = await this.providerAccountRepository.store(body, tenantContext);

      if (result.outcome === "provider_not_found") {
        this.logger.warn(
          {
            action: PROVIDER_ACCOUNTS_STORE_OPERATION,
            correlation_id: correlationId,
            result: "tenant_scope_violation",
          },
          "Provider account store rejected without disclosing provider existence",
        );

        throw new ForbiddenException("No autorizado para crear esta cuenta de proveedor");
      }

      this.logger.log(
        {
          action: PROVIDER_ACCOUNTS_STORE_OPERATION,
          correlation_id: correlationId,
          result: "success",
        },
        "Stored provider account",
      );

      return { success: true, result: result.account, version: result.account.version };
    } catch (error) {
      if (error instanceof ProviderAccountIdentityConflictError) {
        this.logger.warn(
          {
            action: PROVIDER_ACCOUNTS_STORE_OPERATION,
            correlation_id: correlationId,
            result: "conflict",
          },
          "Provider account business identity conflict",
        );

        throw new ConflictException(
          "Ya existe una cuenta de proveedor con esa identidad dentro del tenant autorizado",
        );
      }

      throw error;
    }
  }
}
