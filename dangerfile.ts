import { danger, fail, message, warn } from "danger";

// ─────────────────────────────────────────────────────
// Danger.js — bus-impl-v2 (2026)
// Valida automáticamente la calidad del PR antes de review.
// ─────────────────────────────────────────────────────

const { github } = danger;
const pr = github.pr;
const modifiedFiles = danger.git.modified_files;
const createdFiles = danger.git.created_files;
const allFiles = [...modifiedFiles, ...createdFiles];

// 1. PR demasiado grande (>500 líneas)
const bigPrThreshold = 500;
if (pr.additions + pr.deletions > bigPrThreshold) {
  warn(
    `Este PR tiene ${pr.additions + pr.deletions} líneas cambiadas. Considera dividirlo en PRs más pequeños (<${bigPrThreshold} líneas).`,
  );
}

// 2. PR sin descripción
if (!pr.body || pr.body.trim().length < 20) {
  fail(
    "El PR no tiene descripción o es muy corta. Usa el template y explica qué hace este cambio.",
  );
}

// 3. Cambios en worker requieren revisar semántica at-least-once
const workerChanged = allFiles.some((f) => f.startsWith("src/worker"));
if (workerChanged) {
  warn(
    "Este PR modifica el worker. Revisa idempotencia, reintentos, DLQ, visibilidad SQS y cierre por SIGTERM.",
  );
}

// 4. Cambios en migraciones de BD
const drizzleChanged = allFiles.some((f) => f.startsWith("drizzle/"));
if (drizzleChanged) {
  warn(
    "Este PR modifica migraciones de base de datos. Verifica que sean reversibles y que no haya `DROP` destructivos.",
  );
}

// 5. Cambios en auth sin revisión de seguridad
const authChanged = allFiles.some((f) => f.includes("/auth/"));
if (authChanged) {
  warn("Este PR modifica el módulo de autenticación. Requiere revisión del equipo de seguridad.");
}

// 6. Lockfile modificado sin package.json
const lockfileChanged = allFiles.includes("pnpm-lock.yaml");
const packageJsonChanged = allFiles.includes("package.json");
if (lockfileChanged && !packageJsonChanged) {
  warn("`pnpm-lock.yaml` cambió sin cambios en `package.json`. ¿Fue intencional?");
}

// 7. Archivos de configuración sensibles
const sensitiveFiles = [".env", ".env.local", ".env.production"];
const hasSensitiveFile = allFiles.some((f) => sensitiveFiles.includes(f));
if (hasSensitiveFile) {
  fail(
    "Se detectó un archivo `.env` en el PR. Los archivos de entorno NUNCA deben subirse al repositorio.",
  );
}

// 8. Cambios en contratos OpenAPI
const openapiChanged = allFiles.some((f) => f.includes("openapi"));
if (openapiChanged) {
  message(
    "Este PR modifica contratos OpenAPI. Valida compatibilidad hacia atrás con `pnpm openapi:diff`.",
  );
}

// 9. Nuevos archivos sin tests
const newSrcFiles = createdFiles.filter(
  (f) =>
    f.startsWith("src/") && f.endsWith(".ts") && !f.endsWith(".spec.ts") && !f.endsWith(".test.ts"),
);
const newTestFiles = createdFiles.filter((f) => f.endsWith(".spec.ts") || f.endsWith(".test.ts"));
if (newSrcFiles.length > 0 && newTestFiles.length === 0) {
  warn(
    `Se agregaron ${newSrcFiles.length} archivo(s) de código nuevo sin ningún test. Considera agregar pruebas unitarias.`,
  );
}
