import { type ChildProcess, type StdioOptions, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ContainerRuntime = "docker" | "podman";
type RunOptions = {
  readonly allowFailure?: boolean;
  readonly cwd?: string;
  readonly stdio?: StdioOptions;
};
type RunResult = { readonly exitCode: number };
type TcpTarget = { readonly host: string; readonly port: number; readonly timeoutMs: number };

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const endpoint = process.env["AWS_ENDPOINT_URL"] ?? "http://127.0.0.1:4566";
const endpointUrl = new URL(endpoint);
const host = endpointUrl.hostname;
const port = Number(endpointUrl.port || 4566);
const flociImage = process.env["FLOCI_IMAGE"] ?? "floci/floci:1.5.12";
const containerName = process.env["FLOCI_CONTAINER_NAME"] ?? `${projectSlug()}-floci-local`;
const autostart = process.env["FLOCI_AUTOSTART"] !== "false";

function projectSlug(): string {
  const raw = process.env["VIGILIO_PROJECT_SLUG"] ?? path.basename(projectRoot);
  const slug = raw
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  if (!slug) throw new Error("Unable to infer VIGILIO_PROJECT_SLUG");
  return slug.slice(0, 40);
}

await loadEnvFile(path.join(projectRoot, ".env"));

process.env["NODE_ENV"] = "production";
process.env["APP_STAGE"] = "local";
process.env["AWS_ENDPOINT_URL"] = endpoint;
process.env["AWS_REGION"] ??= "us-east-1";
process.env["AWS_DEFAULT_REGION"] ??= process.env["AWS_REGION"];
process.env["AWS_ACCESS_KEY_ID"] ??= "test";
process.env["AWS_SECRET_ACCESS_KEY"] ??= "test";

let startedContainer = false;
let apiProcess: ChildProcess | undefined;

try {
  await run(pnpmCommand(), ["build"], { cwd: projectRoot, stdio: "inherit" });
  await ensureFlociReady();

  apiProcess = spawn(process.execPath, ["dist/src/main.js"], {
    cwd: projectRoot,
    env: process.env,
    shell: false,
    stdio: "inherit",
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      apiProcess?.kill(signal);
    });
  }

  const exitCode = await waitForExit(apiProcess);
  await stopStartedFloci();
  process.exitCode = exitCode;
} catch (error) {
  await stopStartedFloci();
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

async function ensureFlociReady(): Promise<void> {
  const existingEndpointReady = await waitForTcp({ host, port, timeoutMs: 10_000 });
  if (existingEndpointReady) {
    return;
  }

  if (!autostart) {
    throw new Error(
      `Floci is not reachable at ${endpoint}. Start it before running prod-like AWS.`,
    );
  }

  const runtime = await findContainerRuntime();
  if (!runtime) {
    throw new Error("Docker or Podman is required to auto-start Floci locally.");
  }

  await run(runtime, ["rm", "--force", containerName], {
    allowFailure: true,
    stdio: "ignore",
  });
  await run(runtime, [
    "run",
    "--rm",
    "--detach",
    "--name",
    containerName,
    "--publish",
    `${port}:4566`,
    "--env",
    "FLOCI_STORAGE_MODE=memory",
    flociImage,
  ]);
  startedContainer = true;

  const startedEndpointReady = await waitForTcp({ host, port, timeoutMs: 60_000 });
  if (!startedEndpointReady) {
    throw new Error(`Floci container started but ${endpoint} did not become reachable.`);
  }
}

async function stopStartedFloci(): Promise<void> {
  if (!startedContainer) {
    return;
  }

  const runtime = await findContainerRuntime();
  if (runtime) {
    await run(runtime, ["stop", containerName], { allowFailure: true, stdio: "ignore" });
  }
}

async function loadEnvFile(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    return;
  }

  const text = await readFile(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    process.env[key] ??= value;
  }
}

function waitForExit(childProcess: ChildProcess): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    childProcess.once("error", reject);
    childProcess.once("exit", (exitCode, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(exitCode ?? 0);
    });
  });
}

function waitForTcp({ host, port, timeoutMs }: TcpTarget): Promise<boolean> {
  const startedAt = Date.now();

  return new Promise<boolean>((resolve) => {
    const attempt = (): void => {
      const socket = net.connect({ host, port });

      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(attempt, 500);
      });
    };

    attempt();
  });
}

async function findContainerRuntime(): Promise<ContainerRuntime | undefined> {
  for (const runtime of ["podman", "docker"] as const) {
    const result = await run(runtime, ["--version"], {
      allowFailure: true,
      stdio: "ignore",
    });

    if (result.exitCode === 0) {
      return runtime;
    }
  }

  return undefined;
}

function run(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): Promise<RunResult> {
  return new Promise<RunResult>((resolve, reject) => {
    const spawnCommand = resolveSpawnCommand(command);
    const child = spawn(spawnCommand.command, [...spawnCommand.args, ...args], {
      cwd: options.cwd ?? projectRoot,
      env: process.env,
      shell: false,
      stdio: options.stdio ?? "pipe",
    });

    let stderr = "";
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
    }

    child.once("error", (error) => {
      if (options.allowFailure) {
        resolve({ exitCode: 1 });
        return;
      }
      reject(error);
    });

    child.once("close", (exitCode) => {
      if (exitCode === 0 || options.allowFailure) {
        resolve({ exitCode: exitCode ?? 0 });
        return;
      }

      reject(
        new Error(
          stderr.trim() || `${command} ${args.join(" ")} failed with exit code ${exitCode}`,
        ),
      );
    });
  });
}

function pnpmCommand(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function resolveSpawnCommand(command: string): {
  readonly args: string[];
  readonly command: string;
} {
  if (process.platform === "win32" && command.endsWith(".cmd")) {
    return {
      command: process.env["ComSpec"] ?? "cmd.exe",
      args: ["/d", "/s", "/c", command],
    };
  }

  return {
    command,
    args: [],
  };
}
