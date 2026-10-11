import { Inject, Injectable } from "@nestjs/common";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ProviderAccountsStoreRequestDto } from "@/provider/application/dtos/provider-accounts-store.request.dto";
import { ProviderAccountStoreBlockedError } from "@/provider/application/errors/provider-account-store-blocked.error";
import type {
  IProviderAccountRepository,
  ProviderAccountStoreResult,
} from "@/provider/application/repositories/provider-account.repository.interface";
import type { TrustedTenantContext } from "@/provider/application/security/trusted-tenant-context";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";

/**
 * Adapter Drizzle del agregado `provider_account`.
 *
 * El alta queda fail-closed: el write set canonico exige persistir
 * `provider_account` + evidencia de auditoria append-only en la misma
 * transaccion (S6: la interfaz publica de append del modulo `audit` aun no
 * existe y esa raiz esta fuera de `allowed_paths`), la identidad de negocio
 * durable tenant-local (D4), el valor inicial de `status` (D5) y la
 * exposicion de `secret_ref` en la proyeccion publica (D6) no estan
 * confirmados por el owner y la migracion versionada (S2) aun no materializa
 * la tabla. Este adapter no persiste ningun valor improvisado ni escribe la
 * tabla ajena de auditoria: falla cerrado antes del insert con
 * `ProviderAccountStoreBlockedError`.
 *
 * Cuando D4/D5/D6 se confirmen y S2/S6 existan, aqui vive el alta guardada con
 * columnas explicitas (`tenant_id` desde el contexto de confianza,
 * `provider_id`, `external_account_id`, `currency` exacta y `secret_ref` como
 * referencia opaca) dentro de la transaccion local que el application service
 * posee: la precondicion same-tenant del `provider_id` se resuelve dentro de
 * esa misma transaccion con el predicado de tenant (read purpose-specific o
 * insert guardado), cero filas se clasifica como `provider_not_found` (403 no
 * revelador, jamas un oraculo de existencia), el default de base de datos
 * aplica `version = 1` y el `status` inicial confirmado, y la violacion
 * `23505` del constraint tenant-local de identidad (D4) se traduce a
 * `ProviderAccountIdentityConflictError` sin dejar escapar nada del driver. La
 * proyeccion publica confirmada se devuelve con `returning` explicito y
 * normalizacion ISO de timestamps, sin campos de secreto por el default
 * fail-closed de D6. La operacion no debe activarse antes de eso (tampoco la
 * registra este pack en `src/app.module.ts`: S1).
 */
@Injectable()
export class ProviderAccountRepository implements IProviderAccountRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  store(
    input: ProviderAccountsStoreRequestDto,
    tenantContext: TrustedTenantContext,
  ): Promise<ProviderAccountStoreResult> {
    void input;
    void tenantContext;
    void this.db;

    throw new ProviderAccountStoreBlockedError();
  }
}
