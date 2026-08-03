import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";
import type { AppDatabase } from "@/shared/infrastructure/database/database.types";
import type { HealthResponseDto, ReadinessResponseDto } from "../dtos/health.response.dto";

@Injectable()
export class HealthApplicationService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: AppDatabase,
  ) {}

  health(): HealthResponseDto {
    return { status: "ok" };
  }

  async readiness(): Promise<ReadinessResponseDto> {
    try {
      await this.db.execute(sql`select 1`);
      return { status: "ready" };
    } catch {
      throw new ServiceUnavailableException("Database is not ready");
    }
  }
}
