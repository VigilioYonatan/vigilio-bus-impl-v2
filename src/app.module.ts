import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { AiChatModule } from "./ai-chat/ai-chat.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./observability/metrics.module";
import { ProductModule } from "./product/product.module";
import {
  type EnvironmentVariables,
  validateEnvironment,
} from "./shared/infrastructure/config/environment.schema";
import { JwtAuthGuard } from "./shared/infrastructure/security/jwt-auth.guard";
import { RolesGuard } from "./shared/infrastructure/security/roles.guard";
import { TelemetryModule } from "./telemetry/telemetry.module";
import { UploadModule } from "./upload/upload.module";
import { UserModule } from "./user/user.module";

const { APP_STAGE: processAppStage, NODE_ENV: processNodeEnv } = process.env;
const runtimeEnvironment = process.env as Partial<Record<"APP_VERSION", string>>;

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: [`.env.${processAppStage ?? processNodeEnv ?? "local"}`, ".env"],
      ignoreEnvFile: processAppStage === "production" || processNodeEnv === "production",
      isGlobal: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => {
        const appStage = configService.get("APP_STAGE", { infer: true });
        const logLevel =
          configService.get("LOG_LEVEL", { infer: true }) ??
          (appStage === "production" ? "info" : "debug");

        return {
          pinoHttp: {
            level: logLevel,
            base: {
              version: runtimeEnvironment.APP_VERSION || "local-dev",
            },
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                "req.body.password",
                "req.body.access_token",
                "req.body.id_token",
                "req.body.refresh_token",
                "req.body.token",
                "res.headers.set-cookie",
              ],
              remove: true,
            },
          },
        };
      },
    }),
    AuthModule,
    AiChatModule,
    HealthModule,
    MetricsModule,
    ProductModule,
    TelemetryModule,
    UploadModule,
    UserModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
