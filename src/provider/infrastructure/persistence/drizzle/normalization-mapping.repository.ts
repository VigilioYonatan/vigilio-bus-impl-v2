import { Inject, Injectable } from "@nestjs/common";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { NormalizationMappingsStoreRequestDto } from "@/provider/application/dtos/normalization-mappings-store.request.dto";
import { NormalizationMappingStoreBlockedError } from "@/provider/application/errors/normalization-mapping-store-blocked.error";
import type {
  INormalizationMappingRepository,
  NormalizationMappingStoreResult,
} from "@/provider/application/repositories/normalization-mapping.repository.interface";
import type { TrustedTenantContext } from "@/provider/application/security/trusted-tenant-context";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";

/**
 * Adapter Drizzle del agregado `normalization_mapping`.
 *
 * El alta queda fail-closed: el write set canonico exige persistir
 * `normalization_mapping` + evidencia de auditoria append-only en la misma
 * transaccion (S6: la interfaz publica de append del modulo `audit` aun no
 * existe y esa raiz esta fuera de `allowed_paths`), la identidad de negocio
 * durable (D2) y el valor inicial de `status` (D3) no estan confirmados por el
 * owner y la migracion versionada (S2) aun no materializa la tabla. Este
 * adapter no persiste ningun valor improvisado ni escribe la tabla ajena de
 * auditoria: falla cerrado antes del insert con
 * `NormalizationMappingStoreBlockedError`.
 *
 * Cuando D2/D3 se confirmen y S2/S6 existan, aqui vive el alta guardada con
 * columnas explicitas (`tenant_id` desde el contexto de confianza,
 * `provider_id`, el par origen/target) dentro de la transaccion local que el
 * application service posee: la precondicion same-tenant del `provider_id` se
 * resuelve dentro de esa misma transaccion con el predicado de tenant (read
 * purpose-specific o insert guardado), cero filas se clasifica como
 * `provider_not_found` (403 no revelador, jamas un oraculo de existencia), el
 * default de base de datos aplica `version = 1` y el `status` inicial
 * confirmado, y la violacion `23505` del constraint tenant-local de identidad
 * (D2) se traduce a `NormalizationMappingIdentityConflictError` sin dejar
 * escapar nada del driver. La proyeccion publica confirmada se devuelve con
 * `returning` explicito y normalizacion ISO de timestamps. La operacion no
 * debe activarse antes de eso (tampoco la registra este pack en
 * `src/app.module.ts`: S1).
 */
@Injectable()
export class NormalizationMappingRepository implements INormalizationMappingRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  store(
    input: NormalizationMappingsStoreRequestDto,
    tenantContext: TrustedTenantContext,
  ): Promise<NormalizationMappingStoreResult> {
    void input;
    void tenantContext;
    void this.db;

    throw new NormalizationMappingStoreBlockedError();
  }
}
