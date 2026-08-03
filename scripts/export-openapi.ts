#!/usr/bin/env node

import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module.js";
import { setupSwagger } from "../src/shared/infrastructure/docs/swagger.config.js";

const outputPath = "docs/openapi/openapi.json";
const app = await NestFactory.create(AppModule, {
  logger: false,
});

try {
  const document = setupSwagger(app);
  const normalized = {
    ...document,
    paths: Object.fromEntries(
      Object.entries(document.paths ?? {}).toSorted(([left], [right]) => left.localeCompare(right)),
    ),
  };

  mkdirSync("docs/openapi", { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(normalized, null, 2)}\n`);

  const routeCount = Object.keys(normalized.paths).length;
  const operationCount = Object.values(normalized.paths).reduce(
    (total, pathItem) =>
      total +
      Object.keys(pathItem ?? {}).filter((key) =>
        ["get", "post", "put", "patch", "delete", "options", "head"].includes(key),
      ).length,
    0,
  );
  console.log(
    `OpenAPI exported to ${outputPath}: ${routeCount} paths, ${operationCount} operations`,
  );
} finally {
  await app.close();
}
