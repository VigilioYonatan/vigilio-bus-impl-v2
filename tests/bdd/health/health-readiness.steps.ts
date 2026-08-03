import assert from "node:assert/strict";
import { Given, setWorldConstructor, Then, When, World } from "@cucumber/cucumber";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthApplicationService } from "@/health/application/service/health.application-service";
import type { AppDatabase } from "@/shared/infrastructure/database/database.types";

class HealthWorld extends World {
  databaseAvailable = false;
  error: unknown;
  status?: string;
}

setWorldConstructor(HealthWorld);

Given("que PostgreSQL esta disponible", function (this: HealthWorld) {
  this.databaseAvailable = true;
});

Given("que PostgreSQL no esta disponible", function (this: HealthWorld) {
  this.databaseAvailable = false;
});

When("consulto el estado de readiness", async function (this: HealthWorld) {
  const db = {
    execute: async () => {
      if (!this.databaseAvailable) {
        throw new Error("database unavailable");
      }

      return [];
    },
  } as unknown as AppDatabase;
  const service = new HealthApplicationService(db);

  try {
    const response = await service.readiness();
    this.status = response.status;
  } catch (error) {
    this.error = error;
  }
});

Then("la API reporta el estado {string}", function (this: HealthWorld, status: string) {
  assert.equal(this.status, status);
  assert.equal(this.error, undefined);
});

Then(
  "la API rechaza la instancia con estado de servicio no disponible",
  function (this: HealthWorld) {
    assert.ok(this.error instanceof ServiceUnavailableException);
  },
);
