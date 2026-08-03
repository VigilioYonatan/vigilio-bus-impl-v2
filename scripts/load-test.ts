import { performance } from "node:perf_hooks";

const baseUrl = new URL(process.env["LOAD_BASE_URL"] ?? "http://127.0.0.1:3000");
const soak = process.argv.includes("--soak");
const durationMs = positiveNumber("LOAD_DURATION_SECONDS", soak ? 900 : 15) * 1_000;
const concurrency = positiveNumber("LOAD_CONCURRENCY", soak ? 25 : 10);
const maxErrorRate = number("LOAD_MAX_ERROR_RATE", 0.01);
const maxP95Ms = positiveNumber("LOAD_MAX_P95_MS", 750);
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
  }),
);

if (errorRate > maxErrorRate || p95 > maxP95Ms) {
  throw new Error(
    `Load thresholds failed: error_rate=${errorRate.toFixed(4)} max=${maxErrorRate}, p95=${Math.round(p95)}ms max=${maxP95Ms}ms`,
  );
}

async function runWorker(worker: number): Promise<void> {
  const paths = worker % 2 === 0 ? ["/health", "/ready"] : ["/ready", "/health"];
  let index = 0;
  while (performance.now() < deadline) {
    const started = performance.now();
    try {
      const response = await fetch(new URL(paths[index % paths.length] ?? "/health", baseUrl), {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) errors += 1;
      await response.arrayBuffer();
    } catch {
      errors += 1;
    } finally {
      requests += 1;
      latencies.push(performance.now() - started);
      index += 1;
    }
  }
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
