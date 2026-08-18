import { type StdioOptions, spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

type ContainerRuntime = "docker" | "podman";
type RunOptions = { readonly allowFailure?: boolean; readonly stdio?: StdioOptions };
type RunResult = { readonly exitCode: number };
type TcpTarget = { readonly host: string; readonly port: number; readonly timeoutMs: number };

const projectRoot = path.resolve(import.meta.dirname, "..");
const endpoint = process.env["AWS_ENDPOINT_URL"] ?? "http://127.0.0.1:4566";
const endpointUrl = new URL(endpoint);
const host = endpointUrl.hostname;
const port = Number(endpointUrl.port || 4566);
const flociImage = process.env["FLOCI_IMAGE"] ?? "floci/floci:1.5.12";
const containerName = process.env["FLOCI_CONTAINER_NAME"] ?? `${projectSlug()}-floci-integration`;
const autostart = process.env["FLOCI_AUTOSTART"] !== "false";
const passthroughArgs = process.argv.slice(2);

function projectSlug(): string {
  const raw = process.env["VIGILIO_PROJECT_SLUG"] ?? path.basename(projectRoot);
  const slug = raw
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  if (!slug) throw new Error("Unable to infer VIGILIO_PROJECT_SLUG");
  return slug.slice(0, 40);
}

process.env["AWS_ENDPOINT_URL"] = endpoint;
process.env["AWS_REGION"] ??= "us-east-1";
process.env["AWS_DEFAULT_REGION"] ??= "us-east-1";
process.env["AWS_ACCESS_KEY_ID"] ??= "test";
process.env["AWS_SECRET_ACCESS_KEY"] ??= "test";

await mkdir("reports", { recursive: true });

let startedContainer = false;

try {
  const existingEndpointReady = await waitForTcp({ host, port, timeoutMs: 20_000 });

  if (!existingEndpointReady) {
    if (!autostart) {
      throw new Error(
        `Floci is not reachable at ${endpoint}. Start it before running AWS integration tests.`,
      );
    }

    const runtime = await findContainerRuntime();
    if (!runtime) {
      throw new Error("Docker or Podman is required to auto-start Floci locally.");
    }

    await removeContainerIfExists(runtime);
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

  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  await run(
    pnpmCommand,
    ["exec", "vitest", "run", "--config", "vitest.aws.config.ts", ...passthroughArgs],
    {
      stdio: "inherit",
    },
  );
} finally {
  if (startedContainer) {
    const runtime = await findContainerRuntime();
    if (runtime) {
      await run(runtime, ["stop", containerName], { allowFailure: true });
    }
  }
}

async function findContainerRuntime(): Promise<ContainerRuntime | undefined> {
  for (const runtime of ["podman", "docker"] as const) {
    const result = await run(runtime, ["--version"], { allowFailure: true, stdio: "ignore" });
    if (result.exitCode === 0) {
      return runtime;
    }
  }

  return undefined;
}

async function removeContainerIfExists(runtime: ContainerRuntime): Promise<void> {
  await run(runtime, ["rm", "--force", containerName], { allowFailure: true, stdio: "ignore" });
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

function run(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): Promise<RunResult> {
  return new Promise<RunResult>((resolve, reject) => {
    const useWindowsShell = process.platform === "win32";
    const child = spawn(
      useWindowsShell ? toWindowsCommand(command, args) : command,
      useWindowsShell ? [] : args,
      {
        env: process.env,
        shell: useWindowsShell,
        stdio: options.stdio ?? "pipe",
      },
    );

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

function toWindowsCommand(command: string, args: readonly string[]): string {
  return [command, ...args].map(quoteWindowsArgument).join(" ");
}

function quoteWindowsArgument(value: string): string {
  if (/^[a-zA-Z0-9._:/=@-]+$/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}
