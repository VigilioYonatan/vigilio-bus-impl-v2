import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const booleanString = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}, z.boolean());

const corsAllowedOrigins = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
      : value,
  z.array(z.url()).min(1).default(["http://localhost:4200"]),
);

export const environmentSchema = z
  .object({
    APP_STAGE: z.enum(["local", "development", "staging", "production"]).default("local"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),
    API_DOCS_ENABLED: booleanString.optional(),
    CORS_ALLOWED_ORIGINS: corsAllowedOrigins,
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
    APP_CONFIG_SECRET_ID: optionalNonEmptyString,
    CONFIG_SSM_PREFIX: optionalNonEmptyString,
    DATABASE_URL: optionalNonEmptyString,
    DATABASE_SECRET_ARN: optionalNonEmptyString,
    DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
    DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    // Numero de proxies de confianza delante de la app (ALB, API Gateway, CloudFront).
    // Determina que entrada de X-Forwarded-For se toma como IP real del cliente.
    // Ver el comentario de `trust proxy` en main.ts: pasarse permite falsificar la IP.
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
    JWT_SECRET: z.string().min(32).default("local-development-secret-change-me-please"),
    JWT_ACCESS_TOKEN_TTL: z.string().min(1).default("15m"),
    JWT_REFRESH_TOKEN_TTL: z.string().min(1).default("7d"),
    AUTH_REFRESH_COOKIE_NAME: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .default("rimac_refresh"),
    AUTH_REFRESH_COOKIE_PATH: z.string().startsWith("/").default("/auth"),
    GOOGLE_CLIENT_ID: optionalNonEmptyString,
    BEDROCK_MODEL_ID: optionalNonEmptyString,
    BEDROCK_MAX_TOKENS: z.coerce.number().int().positive().max(4096).default(1024),
    BEDROCK_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.2),
    BEDROCK_TOP_P: z.coerce.number().min(0).max(1).default(0.9),
    AWS_REGION: z.string().min(1).default("us-east-1"),
    AWS_DEFAULT_REGION: optionalNonEmptyString,
    AWS_ENDPOINT_URL: optionalNonEmptyString,
    AWS_ACCESS_KEY_ID: optionalNonEmptyString,
    AWS_SECRET_ACCESS_KEY: optionalNonEmptyString,
    UPLOAD_BUCKET_NAME: z.string().min(3).default("bus-impl-local-uploads"),
    UPLOAD_KEY_PREFIX: z.string().trim().min(1).default("uploads"),
    UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS: z.coerce.number().int().positive().max(3600).default(900),
    SQS_QUEUE_URL: optionalNonEmptyString,
    WORKER_WAIT_TIME_SECONDS: z.coerce.number().int().min(1).max(20).default(20),
    WORKER_VISIBILITY_TIMEOUT_SECONDS: z.coerce.number().int().min(30).max(43_200).default(120),
    WORKER_MAX_MESSAGES: z.coerce.number().int().min(1).max(10).default(10),
  })
  .passthrough()
  .superRefine((environment, context) => {
    const hasAwsAccessKeyId = Boolean(environment.AWS_ACCESS_KEY_ID);
    const hasAwsSecretAccessKey = Boolean(environment.AWS_SECRET_ACCESS_KEY);

    if (hasAwsAccessKeyId !== hasAwsSecretAccessKey) {
      context.addIssue({
        code: "custom",
        message: "AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY deben configurarse juntos",
        path: ["AWS_ACCESS_KEY_ID"],
      });
    }

    // Políticas estrictas para Producción/Staging (2026 Senior Standard)
    const isProdLike = ["staging", "production"].includes(environment.APP_STAGE);

    if (isProdLike) {
      if (
        environment.CORS_ALLOWED_ORIGINS.some(
          (origin) => origin === "*" || new URL(origin).hostname === "localhost",
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "CORS_ALLOWED_ORIGINS no permite wildcard ni localhost en staging/production",
          path: ["CORS_ALLOWED_ORIGINS"],
        });
      }

      // 1. JWT no puede usar el default expuesto
      if (environment.JWT_SECRET === "local-development-secret-change-me-please") {
        context.addIssue({
          code: "custom",
          message:
            "SECURITY FATAL: JWT_SECRET no puede usar el valor por defecto en entornos productivos.",
          path: ["JWT_SECRET"],
        });
      }

      // 2. Prohibir credenciales hardcodeadas (Debe usar IAM Roles)
      if (hasAwsAccessKeyId || hasAwsSecretAccessKey) {
        context.addIssue({
          code: "custom",
          message:
            "SECURITY FATAL: No debes inyectar AWS_ACCESS_KEY_ID en producción. El contenedor debe heredar un IAM Role nativo.",
          path: ["AWS_ACCESS_KEY_ID"],
        });
      }

      // 3. Forzar conexión a base de datos
      if (!environment.DATABASE_URL && !environment.DATABASE_SECRET_ARN) {
        context.addIssue({
          code: "custom",
          message:
            "FATAL: Debes proveer DATABASE_URL o DATABASE_SECRET_ARN en entornos productivos.",
          path: ["DATABASE_URL"],
        });
      }
    }
  });

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join(".") || "ENV"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Variables de entorno invalidas:\n${errors}`);
  }

  return result.data;
}

/**
 * Validación híbrida (2026 Senior Standard):
 * - En local: lee .env
 * - En cloud: lee SSM Parameter Store + Secrets Manager
 * Luego valida todo con Zod.
 */
export async function validateEnvironmentAsync(): Promise<EnvironmentVariables> {
  const { loadConfig } = await import("./config-loader.js");
  const config = await loadConfig();
  const environment = validateEnvironment(config);

  for (const [key, value] of Object.entries(environment)) {
    if (value !== undefined) {
      process.env[key] = String(value);
    }
  }

  return environment;
}
