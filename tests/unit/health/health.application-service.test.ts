import { ServiceUnavailableException } from "@nestjs/common";
import { HealthApplicationService } from "@/health/application/service/health.application-service";
import type { AppDatabase } from "@/shared/infrastructure/database/database.types";

describe("HealthApplicationService", () => {
  it("reporta liveness sin depender de servicios externos", () => {
    const service = new HealthApplicationService({} as AppDatabase);

    expect(service.health()).toEqual({ status: "ok" });
  });

  it("reporta readiness cuando PostgreSQL responde", async () => {
    const db = { execute: vi.fn().mockResolvedValue([]) } as unknown as AppDatabase;
    const service = new HealthApplicationService(db);

    await expect(service.readiness()).resolves.toEqual({ status: "ready" });
    expect(db.execute).toHaveBeenCalledOnce();
  });

  it("devuelve 503 cuando PostgreSQL no responde", async () => {
    const db = {
      execute: vi.fn().mockRejectedValue(new Error("offline")),
    } as unknown as AppDatabase;
    const service = new HealthApplicationService(db);

    await expect(service.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
