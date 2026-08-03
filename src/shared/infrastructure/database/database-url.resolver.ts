import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { z } from "zod";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";

const databaseSecretSchema = z.object({
  dbname: z.string().min(1).default("bus_impl"),
  host: z.string().min(1),
  password: z.string().min(1),
  port: z.coerce.number().int().positive().max(65_535).default(5432),
  username: z.string().min(1),
});

type DatabaseConfiguration = {
  APP_STAGE: EnvironmentVariables["APP_STAGE"];
  AWS_REGION: EnvironmentVariables["AWS_REGION"];
  DATABASE_SECRET_ARN: string | undefined;
  DATABASE_URL: string | undefined;
};

interface SecretsReader {
  send(command: GetSecretValueCommand): Promise<{ SecretString?: string }>;
}

export async function resolveDatabaseUrl(
  configuration: DatabaseConfiguration,
  secretsReader?: SecretsReader,
): Promise<string> {
  if (configuration.DATABASE_URL) {
    return configuration.DATABASE_URL;
  }

  if (!configuration.DATABASE_SECRET_ARN) {
    if (configuration.APP_STAGE === "local") {
      const localUrl = new URL("postgres://127.0.0.1:5432");
      localUrl.username = "postgres";
      localUrl.password = "postgres";
      localUrl.pathname = "bus_impl";
      return localUrl.toString();
    }

    throw new Error("DATABASE_URL o DATABASE_SECRET_ARN es obligatorio fuera de local");
  }

  const ownedClient = secretsReader
    ? undefined
    : new SecretsManagerClient({ region: configuration.AWS_REGION });
  const client: SecretsReader = secretsReader ?? (ownedClient as SecretsReader);

  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: configuration.DATABASE_SECRET_ARN }),
    );

    if (!response.SecretString) {
      throw new Error("El secreto RDS no contiene SecretString");
    }

    const secret = databaseSecretSchema.parse(JSON.parse(response.SecretString) as unknown);
    const url = new URL("postgresql://localhost");
    url.hostname = secret.host;
    url.port = String(secret.port);
    url.username = secret.username;
    url.password = secret.password;
    url.pathname = secret.dbname;
    url.searchParams.set("sslmode", "require");

    return url.toString();
  } catch (error) {
    throw new Error("No se pudo resolver la conexion PostgreSQL desde DATABASE_SECRET_ARN", {
      cause: error,
    });
  } finally {
    ownedClient?.destroy();
  }
}
