import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("openapi artifact exposes business and auth endpoints @contract @smoke", async () => {
  const document = JSON.parse(readFileSync("docs/openapi/openapi.json", "utf8")) as {
    components?: {
      schemas?: Record<string, unknown>;
      securitySchemes?: {
        bearer?: { scheme?: string; type?: string };
      };
    };
    paths?: Record<
      string,
      {
        post?: {
          requestBody?: {
            content?: {
              "application/json"?: { schema?: { oneOf?: unknown[] } };
            };
          };
        };
      }
    >;
  };

  expect(document.paths?.["/health"]).toBeDefined();
  expect(document.paths?.["/ready"]).toBeDefined();
  expect(document.paths?.["/auth/register"]).toBeDefined();
  expect(document.paths?.["/auth/login"]).toBeDefined();
  expect(document.paths?.["/auth/google"]).toBeDefined();
  expect(document.paths?.["/auth/refresh"]).toBeDefined();
  expect(document.paths?.["/users"]).toBeDefined();
  expect(document.paths?.["/users/{id}"]).toBeDefined();
  expect(document.paths?.["/products"]).toBeDefined();
  expect(document.paths?.["/products/{id}"]).toBeDefined();
  expect(document.paths?.["/uploads/presigned-url"]).toBeDefined();
  expect(document.paths?.["/telemetry/frontend"]).toBeDefined();
  expect(
    document.paths?.["/telemetry/frontend"]?.post?.requestBody?.content?.["application/json"]
      ?.schema?.oneOf,
  ).toHaveLength(3);
  expect(document.components?.securitySchemes?.bearer).toMatchObject({
    scheme: "bearer",
    type: "http",
  });

  const publicAuthResponses = Object.fromEntries(
    Object.entries(document.components?.schemas ?? {}).filter(([name]) =>
      /^Auth(?:Google|Login|Refresh|Register)ResponseDocDto_Output$/.test(name),
    ),
  );
  expect(Object.keys(publicAuthResponses)).toHaveLength(4);
  expect(JSON.stringify(publicAuthResponses)).not.toContain("refresh_token");
});
