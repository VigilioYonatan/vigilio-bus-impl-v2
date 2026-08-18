import { randomBytes } from "node:crypto";

type JsonRecord = Record<string, unknown>;
type RequestOptions = {
  readonly auth?: boolean;
  readonly body?: JsonRecord;
  readonly expectedStatus?: number;
};
type SmokeStep = { readonly name: string; readonly run: () => Promise<unknown> };

const baseUrl = normalizeBaseUrl(process.env["API_BASE_URL"] ?? "http://127.0.0.1:3000");
const runId = new Date()
  .toISOString()
  .replaceAll(/[-:.TZ]/g, "")
  .slice(0, 14);
const password = `Smoke-${randomBytes(24).toString("base64url")}!aA1`;

const state = {
  access_token: "",
  product_id: 0,
  refresh_token: "",
  user_id: 0,
};

const steps: SmokeStep[] = [
  {
    name: "GET /health",
    run: () => request("GET", "/health"),
  },
  {
    name: "GET /ready",
    run: () => request("GET", "/ready"),
  },
  {
    name: "GET /docs-json",
    run: () => request("GET", "/docs-json"),
  },
  {
    name: "POST /auth/register",
    run: async () => {
      const response = await request("POST", "/auth/register", {
        body: {
          email: `smoke.admin.${runId}@example.com`,
          full_name: "Smoke Admin",
          password,
        },
        expectedStatus: 201,
      });

      state.access_token = readString(response, "access_token");
      state.refresh_token = readString(response, "refresh_token");
    },
  },
  {
    name: "POST /auth/login",
    run: async () => {
      const response = await request("POST", "/auth/login", {
        body: {
          email: `smoke.admin.${runId}@example.com`,
          password,
        },
      });

      state.access_token = readString(response, "access_token");
    },
  },
  {
    name: "POST /auth/refresh",
    run: async () => {
      const response = await request("POST", "/auth/refresh", {
        body: {
          refresh_token: state.refresh_token,
        },
      });

      state.access_token = readString(response, "access_token");
    },
  },
  {
    name: "POST /uploads/presigned-url",
    run: () =>
      request("POST", "/uploads/presigned-url", {
        auth: true,
        body: {
          file_name: "smoke.csv",
          mime_type: "text/csv",
          purpose: "document",
          size_bytes: 1024,
        },
        expectedStatus: 201,
      }),
  },
  {
    name: "GET /users",
    run: () => request("GET", "/users?limit=10&offset=0", { auth: true }),
  },
  {
    name: "POST /users",
    run: async () => {
      const response = await request("POST", "/users", {
        auth: true,
        body: {
          email: `smoke.user.${runId}@example.com`,
          full_name: "Smoke User",
          password,
          role: "operador",
          status: "active",
        },
        expectedStatus: 201,
      });

      state.user_id = readNumber(response, "user.id");
    },
  },
  {
    name: "GET /users/:id",
    run: () => request("GET", `/users/${state.user_id}`, { auth: true }),
  },
  {
    name: "PATCH /users/:id",
    run: () =>
      request("PATCH", `/users/${state.user_id}`, {
        auth: true,
        body: {
          full_name: "Smoke User Updated",
          status: "active",
        },
      }),
  },
  {
    name: "POST /products",
    run: async () => {
      const response = await request("POST", "/products", {
        auth: true,
        body: {
          descripcion: "Producto creado por smoke test HTTP",
          nombre: "Smoke Product",
          precio: "99.90",
          sku: `SMOKE-${runId}`,
          status: "active",
          stock: 10,
        },
        expectedStatus: 201,
      });

      state.product_id = readNumber(response, "product.id");
    },
  },
  {
    name: "GET /products",
    run: () => request("GET", "/products?limit=10&offset=0", { auth: true }),
  },
  {
    name: "GET /products/:id",
    run: () => request("GET", `/products/${state.product_id}`, { auth: true }),
  },
  {
    name: "PATCH /products/:id",
    run: () =>
      request("PATCH", `/products/${state.product_id}`, {
        auth: true,
        body: {
          precio: "109.90",
          stock: 12,
        },
      }),
  },
  {
    name: "DELETE /products/:id",
    run: () => request("DELETE", `/products/${state.product_id}`, { auth: true }),
  },
  {
    name: "DELETE /users/:id",
    run: () => request("DELETE", `/users/${state.user_id}`, { auth: true }),
  },
];

console.log(`Running endpoint smoke against ${baseUrl}`);

for (const step of steps) {
  try {
    await step.run();
    console.log(`OK ${step.name}`);
  } catch (error) {
    console.error(`FAIL ${step.name}`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log("Endpoint smoke completed successfully.");
}

async function request(
  method: string,
  requestPath: string,
  options: RequestOptions = {},
): Promise<JsonRecord> {
  const headers = {
    accept: "application/json",
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(options.auth ? { authorization: `Bearer ${state.access_token}` } : {}),
  };

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${requestPath}`, {
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      headers,
      method,
      signal: AbortSignal.timeout(Number(process.env["SMOKE_TIMEOUT_MS"] ?? 10_000)),
    });
  } catch (error) {
    throw createConnectionError(method, requestPath, error);
  }

  const text = await response.text();
  const payload = parseJson(text);
  const expectedStatus = options.expectedStatus ?? 200;

  if (response.status !== expectedStatus) {
    const requestId =
      response.headers.get("x-request-id") ?? response.headers.get("x-amzn-requestid");
    throw new Error(
      [
        `${method} ${requestPath} returned ${response.status}, expected ${expectedStatus}.`,
        text
          ? `Response body omitted to protect tokens and PII (${text.length} characters).`
          : "Response body was empty.",
        ...(requestId ? [`Request ID: ${requestId}`] : []),
      ].join("\n"),
    );
  }

  return payload;
}

function createConnectionError(method: string, requestPath: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);

  return new Error(
    [
      `${method} ${requestPath} could not reach ${baseUrl}.`,
      `Detail: ${detail}`,
      "",
      "Start the API first:",
      "  pnpm start:dev",
      "",
      "If the API uses another port:",
      "  API_BASE_URL=http://127.0.0.1:3001 pnpm smoke:endpoints",
      "",
      "Also verify PostgreSQL is running and DATABASE_URL is configured.",
    ].join("\n"),
  );
}

function parseJson(text: string): JsonRecord {
  if (!text) {
    return {};
  }

  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonRecord)
      : {};
  } catch {
    return {};
  }
}

function readString(payload: JsonRecord, valuePath: string): string {
  const value = readPath(payload, valuePath);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected "${valuePath}" to be a non-empty string.`);
  }

  return value;
}

function readNumber(payload: JsonRecord, valuePath: string): number {
  const value = readPath(payload, valuePath);

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Expected "${valuePath}" to be an integer.`);
  }

  return value;
}

function readPath(payload: unknown, valuePath: string): unknown {
  let current = payload;
  for (const key of valuePath.split(".")) {
    if (current === null || typeof current !== "object" || !(key in current)) return undefined;
    current = (current as JsonRecord)[key];
  }
  return current;
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
