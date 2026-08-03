import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { ZodValidationPipe } from "nestjs-zod";
import { metricsMiddleware } from "./observability/metrics";
import {
  type EnvironmentVariables,
  validateEnvironmentAsync,
} from "./shared/infrastructure/config/environment.schema";
import { setupSwagger } from "./shared/infrastructure/docs/swagger.config";
import { correlationIdMiddleware } from "./shared/infrastructure/http/middleware/correlation-id.middleware";
import { createSecurityHeadersMiddleware } from "./shared/infrastructure/http/middleware/security-headers.middleware";
import { collectRegisteredRoutes } from "./shared/infrastructure/http/route-inspector";

function logRegisteredRoutes(app: INestApplication, logger: Logger, baseUrl: string): void {
  const routes = collectRegisteredRoutes(app);

  if (routes.length === 0) {
    return;
  }

  logger.log("📋 Rutas HTTP registradas:");
  for (const route of routes) {
    logger.log(`   --> [${route.method.padEnd(6)}] ${baseUrl}${route.path}`);
  }
}

async function bootstrap() {
  const environment = await validateEnvironmentAsync();
  const { AppModule } = await import("./app.module.js");
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  // `request.ip` solo es fiable si Express sabe cuantos proxies hay delante.
  // Con el valor por defecto leeria la IP del balanceador para todas las peticiones
  // y el rate limiting por IP bloquearia a todo el mundo a la vez. Configurar de mas
  // es peor: dejaria a un cliente falsificar X-Forwarded-For y saltarse el limite.
  app.getHttpAdapter().getInstance().set("trust proxy", environment.TRUSTED_PROXY_HOPS);

  app.use(correlationIdMiddleware);
  app.use(metricsMiddleware);
  app.use(
    createSecurityHeadersMiddleware({
      enableHsts: environment.APP_STAGE !== "local",
    }),
  );
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableCors({
    allowedHeaders: ["authorization", "content-type", "x-correlation-id"],
    // El access token sigue viajando por Authorization; credentials se habilita
    // exclusivamente para la cookie HttpOnly de refresh. Los origins vienen de
    // una allowlist validada y nunca pueden ser wildcard en entornos productivos.
    credentials: true,
    exposedHeaders: ["x-correlation-id"],
    methods: ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"],
    origin: environment.CORS_ALLOWED_ORIGINS,
  });
  app.enableShutdownHooks();

  const docsEnabled = environment.API_DOCS_ENABLED ?? environment.APP_STAGE !== "production";
  if (docsEnabled) {
    setupSwagger(app);
  }

  const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const port = configService.get("PORT", { infer: true });

  await app.listen(port, "0.0.0.0");

  const baseUrl = `http://localhost:${port}`;
  logger.log(`🚀 Aplicación escuchando en: ${baseUrl}`);
  if (docsEnabled) {
    logger.log(`📚 Swagger Docs disponible en: ${baseUrl}/docs`);
  }

  // Solo en local: en cloud el listado va a CloudWatch en cada arranque en frio
  // sin aportar nada, y expone el mapa de rutas en los logs.
  if (environment.APP_STAGE === "local") {
    logRegisteredRoutes(app, logger, baseUrl);
  }
}

void bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
