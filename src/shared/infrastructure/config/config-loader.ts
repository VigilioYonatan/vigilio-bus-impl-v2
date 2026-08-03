import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Stage = "local" | "development" | "staging" | "production";

interface ConfigLoaderOptions {
  /** Stage actual. Se lee de APP_STAGE o se pasa explícitamente. */
  stage?: Stage;
  /** Prefijo en SSM Parameter Store (ej. /bus-impl/development/) */
  ssmPrefix?: string;
  /** ARN o nombre del secreto en Secrets Manager (secretos sensibles) */
  secretName?: string;
  /** Región AWS. Default: us-east-1 */
  region?: string;
}

const allowedStages: readonly Stage[] = ["local", "development", "staging", "production"];

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

function parseEnvFile(filePath: string): Record<string, string> {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) return {};

  const content = readFileSync(absolutePath, "utf-8");
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    // Remover comillas envolventes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function normalizeStage(value: string): Stage {
  if (allowedStages.includes(value as Stage)) {
    return value as Stage;
  }

  throw new Error(`APP_STAGE invalido "${value}". Valores permitidos: ${allowedStages.join(", ")}`);
}

async function fetchSsmParameters(prefix: string, region: string): Promise<Record<string, string>> {
  const client = new SSMClient({ region });
  const result: Record<string, string> = {};
  let nextToken: string | undefined;

  do {
    const command = new GetParametersByPathCommand({
      Path: prefix,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken,
    });

    const response = await client.send(command);

    for (const parameter of response.Parameters ?? []) {
      if (!parameter.Name || parameter.Value === undefined) continue;
      // Convierte /bus-impl/development/DATABASE_URL → DATABASE_URL
      const key = parameter.Name.replace(prefix, "").replace(/^\//, "");
      result[key] = parameter.Value;
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return result;
}

async function fetchSecretsManagerJson(
  secretName: string,
  region: string,
): Promise<Record<string, string>> {
  const client = new SecretsManagerClient({ region });

  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);

  if (!response.SecretString) return {};

  try {
    return JSON.parse(response.SecretString) as Record<string, string>;
  } catch {
    console.warn(`[config-loader] El secreto "${secretName}" no es JSON válido. Se ignora.`);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Loader Híbrido Principal
// ---------------------------------------------------------------------------

/**
 * Carga las variables de entorno de forma híbrida:
 *
 * - `local`        → Lee el archivo `.env` del proyecto.
 * - `development`  → SSM Parameter Store + Secrets Manager (cuenta AWS Development).
 * - `staging`      → SSM Parameter Store + Secrets Manager (cuenta AWS Production).
 * - `production`   → SSM Parameter Store + Secrets Manager (cuenta AWS Production).
 *
 * Prioridad (de mayor a menor):
 *   1. Variables de entorno del SO (process.env) — siempre ganan.
 *   2. Secrets Manager (secretos sensibles como JWT_SECRET, DATABASE_URL).
 *   3. SSM Parameter Store (configuración general).
 *   4. Archivo .env (solo en modo local como fallback).
 */
export async function loadConfig(
  options: ConfigLoaderOptions = {},
): Promise<Record<string, string>> {
  const runtimeEnvironment = process.env as Partial<
    Record<"APP_CONFIG_SECRET_ID" | "APP_STAGE" | "AWS_REGION" | "CONFIG_SSM_PREFIX", string>
  >;
  const stageOption = options.stage ?? runtimeEnvironment.APP_STAGE ?? "local";
  const regionOption = options.region ?? runtimeEnvironment.AWS_REGION ?? "us-east-1";
  const stage = normalizeStage(stageOption);
  const region = regionOption;
  const ssmPrefix = options.ssmPrefix ?? runtimeEnvironment.CONFIG_SSM_PREFIX;
  const secretName = options.secretName ?? runtimeEnvironment.APP_CONFIG_SECRET_ID;

  // Capa 1: Archivo .env (solo en modo local)
  let fileVars: Record<string, string> = {};
  if (stage === "local") {
    console.log("[config-loader] Modo LOCAL → Leyendo .env");
    fileVars = parseEnvFile(".env");
  }

  // Capa 2 y 3: SSM + Secrets Manager (solo en modos cloud)
  let ssmVars: Record<string, string> = {};
  let secretVars: Record<string, string> = {};

  if (stage !== "local" && ssmPrefix) {
    console.log(`[config-loader] Modo CLOUD → Conectando a SSM prefix="${ssmPrefix}"`);

    try {
      ssmVars = await fetchSsmParameters(ssmPrefix, region);
      console.log(`[config-loader] SSM: ${Object.keys(ssmVars).length} parámetros cargados.`);
    } catch (_error) {
      console.error("[config-loader] ERROR leyendo SSM Parameter Store:", _error);
      throw new Error(
        `No se pudo leer SSM con prefix "${ssmPrefix}". ¿El IAM Role tiene permisos ssm:GetParametersByPath?`,
      );
    }
  }

  if (stage !== "local" && secretName) {
    try {
      secretVars = await fetchSecretsManagerJson(secretName, region);
      console.log(
        `[config-loader] Secrets Manager: ${Object.keys(secretVars).length} secretos cargados.`,
      );
    } catch (_error) {
      throw new Error(
        `No se pudo leer Secrets Manager "${secretName}". Verifica el ARN y secretsmanager:GetSecretValue.`,
        { cause: _error },
      );
    }
  }

  // Merge con prioridad: process.env > Secrets Manager > SSM > .env
  const merged: Record<string, string> & { APP_STAGE: string } = {
    ...fileVars,
    ...ssmVars,
    ...secretVars,
    ...(Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => value !== undefined),
    ) as Record<string, string>),
    APP_STAGE: stage,
  };

  // Garantizar que APP_STAGE siempre esté presente
  return merged;
}
