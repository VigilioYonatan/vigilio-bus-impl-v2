#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageManagerCli = process.env["npm_execpath"];
const conventionalChecks = [
  { artifact: "src/contracts.ts", script: "build:contracts" },
  { artifact: "docs/openapi/openapi.json", script: "openapi:export" },
] as const;
const packageManifest: unknown = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8"),
);
const availableScripts = readScriptNames(packageManifest);
const checks = conventionalChecks.filter(({ script }) => availableScripts.has(script));
const generatedArtifacts = checks.map(({ artifact }) => artifact);

if (checks.length === 0) {
  throw new Error(
    "No conventional generated artifacts were discovered. Configure build:contracts or openapi:export.",
  );
}

function readScriptNames(manifest: unknown): Set<string> {
  if (manifest === null || typeof manifest !== "object" || !("scripts" in manifest)) {
    return new Set();
  }
  const { scripts } = manifest;
  if (scripts === null || typeof scripts !== "object") return new Set();
  return new Set(
    Object.entries(scripts)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([name]) => name),
  );
}

async function readOptional(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

function runScript(script: string): void {
  if (!packageManagerCli) {
    throw new Error("Run this verification through the package manager: pnpm verify:generated");
  }

  const result = spawnSync(process.execPath, [packageManagerCli, script], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status ?? "unknown"}`);
  }
}

const originals = new Map<string, Buffer | null>();
for (const relativePath of generatedArtifacts) {
  originals.set(relativePath, await readOptional(path.join(projectRoot, relativePath)));
}

let generationError: Error | null = null;
const driftedArtifacts: string[] = [];

try {
  for (const { script } of checks) runScript(script);
  for (const relativePath of generatedArtifacts) {
    const before = originals.get(relativePath) ?? null;
    const after = await readOptional(path.join(projectRoot, relativePath));
    if (before === null ? after !== null : after === null || !before.equals(after)) {
      if (!driftedArtifacts.includes(relativePath)) driftedArtifacts.push(relativePath);
    }
  }
} catch (error: unknown) {
  generationError = error instanceof Error ? error : new Error(String(error));
} finally {
  for (const relativePath of generatedArtifacts) {
    const absolutePath = path.join(projectRoot, relativePath);
    const original = originals.get(relativePath) ?? null;
    if (original === null) await rm(absolutePath, { force: true });
    else await writeFile(absolutePath, original);
  }
}

if (generationError) throw generationError;
if (driftedArtifacts.length > 0) {
  const commands = checks.map(({ script }) => `pnpm ${script}`).join(" && ");
  throw new Error(
    `Generated artifacts are stale: ${driftedArtifacts.join(", ")}. Run ${commands}, review the diff and commit it.`,
  );
}

console.log("Generated contracts and OpenAPI are up to date.");
