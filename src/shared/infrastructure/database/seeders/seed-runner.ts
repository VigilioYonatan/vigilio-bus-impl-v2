import { seedProducts } from "@/product/infrastructure/persistence/drizzle/product.seeder";
import type { AppDatabase } from "@/shared/infrastructure/database/database.types";
import { seedUsers } from "@/user/infrastructure/persistence/drizzle/user.seeder";

export interface SeedResult {
  readonly admin_user_id: number | null;
}

export async function runDatabaseSeeders(db: AppDatabase): Promise<SeedResult> {
  const userSeedResult = await seedUsers(db);
  await seedProducts(db);

  return userSeedResult;
}
