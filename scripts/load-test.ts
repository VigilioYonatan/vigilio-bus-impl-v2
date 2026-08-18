import { performance } from "node:perf_hooks";

const baseUrl = new URL(process.env["LOAD_BASE_URL"] ?? "http://127.0.0.1:3000");
const soak = process.argv.includes("--soak");
const durationMs = positiveNumber("LOAD_DURATION_SECONDS", soak ? 900 : 15) * 1_000;
const concurrency = positiveInteger("LOAD_CONCURRENCY", soak ? 25 : 10);
const maxErrorRate = number("LOAD_MAX_ERROR_RATE", 0.01);
const maxP95Ms = positiveNumber("LOAD_MAX_P95_MS", 750);
const requestTimeoutMs = positiveNumber("LOAD_REQUEST_TIMEOUT_MS", 5_000);
const maxLatencySamples = positiveInteger("LOAD_MAX_LATENCY_SAMPLES", 100_000);
const requestPaths = parsePaths(process.env["LOAD_PATHS"] ?? "/health,/ready");
const deadline = performance.now() + durationMs;
const latencies: number[] = [];
let requests = 0;
let errors = 0;

await Promise.all(Array.from({ length: concurrency }, (_, worker) => runWorker(worker)));

latencies.sort((left, right) => left - right);
const p95 = latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] ?? 0;
const errorRate = requests === 0 ? 1 : errors / requests;

console.log(
  JSON.stringify({
    concurrency,
    duration_ms: durationMs,
    error_rate: errorRate,
    p95_ms: Math.round(p95),
    requests,
    sampled_latencies: latencies.length,
  }),
);

if (errorRate > maxErrorRate || p95 > maxP95Ms) {
  throw new Error(
    `Load thresholds failed: error_rate=${errorRate.toFixed(4)} max=${maxErrorRate}, p95=${Math.round(p95)}ms max=${maxP95Ms}ms`,
  );
}

async function runWorker(worker: number): Promise<void> {
  let index = 0;
  while (performance.now() < deadline) {
    const started = performance.now();
    try {
      const requestPath = requestPaths[(worker + index) % requestPaths.length] ?? "/health";
      const response = await fetch(new URL(requestPath, baseUrl), {
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (!response.ok) errors += 1;
      await response.arrayBuffer();
    } catch {
      errors += 1;
    } finally {
      requests += 1;
      recordLatency(performance.now() - started, requests);
      index += 1;
    }
  }
}

function recordLatency(latencyMs: number, seenRequests: number): void {
  if (latencies.length < maxLatencySamples) {
    latencies.push(latencyMs);
    return;
  }

  const replacementIndex = Math.floor(Math.random() * seenRequests);
  if (replacementIndex < maxLatencySamples) latencies[replacementIndex] = latencyMs;
}

function parsePaths(value: string): string[] {
  const paths = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (paths.length === 0 || paths.some((item) => !item.startsWith("/"))) {
    throw new Error("LOAD_PATHS must be a comma-separated list of absolute HTTP paths");
  }
  return paths;
}

function positiveInteger(name: string, fallback: number): number {
  const value = positiveNumber(name, fallback);
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer`);
  return value;
}

function positiveNumber(name: string, fallback: number): number {
  const value = number(name, fallback);
  if (value <= 0) throw new Error(`${name} must be greater than zero`);
  return value;
}

function number(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number`);
  return value;
}
