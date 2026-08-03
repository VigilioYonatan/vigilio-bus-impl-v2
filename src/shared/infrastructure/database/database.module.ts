import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";
import { DRIZZLE_DB } from "./database.constants";
import { databaseSchema } from "./database.schema";
import { resolveDatabaseUrl } from "./database-url.resolver";

@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<EnvironmentVariables, true>) => {
        const connectionString = await resolveDatabaseUrl({
          APP_STAGE: configService.get("APP_STAGE", { infer: true }),
          AWS_REGION: configService.get("AWS_REGION", { infer: true }),
          DATABASE_SECRET_ARN: configService.get("DATABASE_SECRET_ARN", { infer: true }),
          DATABASE_URL: configService.get("DATABASE_URL", { infer: true }),
        });
        const pool = new Pool({
          connectionString,
          idleTimeoutMillis: configService.get("DATABASE_IDLE_TIMEOUT_MS", { infer: true }),
          max: configService.get("DATABASE_POOL_MAX", { infer: true }),
        });

        return drizzle(pool, { schema: databaseSchema });
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
