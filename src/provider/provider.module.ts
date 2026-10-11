import { Module } from "@nestjs/common";
import { NORMALIZATION_MAPPING_REPOSITORY } from "@/provider/application/repositories/normalization-mapping.repository.token";
import { PROVIDER_REPOSITORY } from "@/provider/application/repositories/provider.repository.token";
import { PROVIDER_ACCOUNT_REPOSITORY } from "@/provider/application/repositories/provider-account.repository.token";
import { TRUSTED_TENANT_CONTEXT_RESOLVER } from "@/provider/application/security/trusted-tenant-context.token";
import { ProviderApplicationService } from "@/provider/application/service/provider.application-service";
import { NormalizationMappingsController } from "@/provider/infrastructure/http/controllers/normalization-mappings.controller";
import { ProviderAccountsController } from "@/provider/infrastructure/http/controllers/provider-accounts.controller";
import { ProvidersController } from "@/provider/infrastructure/http/controllers/providers.controller";
import { HttpTrustedTenantContextResolver } from "@/provider/infrastructure/http/trusted-tenant-context.resolver";
import { NormalizationMappingRepository } from "@/provider/infrastructure/persistence/drizzle/normalization-mapping.repository";
import { ProviderRepository } from "@/provider/infrastructure/persistence/drizzle/provider.repository";
import { ProviderAccountRepository } from "@/provider/infrastructure/persistence/drizzle/provider-account.repository";
import { DatabaseModule } from "@/shared/infrastructure/database/database.module";

/**
 * Modulo `provider` (slices `providers-store` + `providers-index` +
 * `disable-provider` + `normalization-mappings-store` +
 * `provider-accounts-store`).
 *
 * Wiring del controller/providers/tokens. El modulo NO se registra en
 * `src/app.module.ts` (fuera de `allowed_paths`; scope item S1) y las
 * operaciones no estan activadas. El append de auditoria de los casos de uso
 * (S6) no tiene binding porque la interfaz publica no existe; no se escriben
 * tablas ajenas. La creacion de providers, la deshabilitacion, el alta de
 * mapeos de normalizacion y el alta de cuentas de proveedor permanecen
 * fail-closed ({@link ProviderRepository},
 * {@link NormalizationMappingRepository}, {@link ProviderAccountRepository})
 * hasta que D1/D2/D3/D4/D5/D6 se confirmen y S6/S2 existan.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [NormalizationMappingsController, ProviderAccountsController, ProvidersController],
  providers: [
    ProviderApplicationService,
    {
      provide: PROVIDER_REPOSITORY,
      useClass: ProviderRepository,
    },
    {
      provide: NORMALIZATION_MAPPING_REPOSITORY,
      useClass: NormalizationMappingRepository,
    },
    {
      provide: PROVIDER_ACCOUNT_REPOSITORY,
      useClass: ProviderAccountRepository,
    },
    {
      provide: TRUSTED_TENANT_CONTEXT_RESOLVER,
      useClass: HttpTrustedTenantContextResolver,
    },
  ],
})
export class ProviderModule {}
