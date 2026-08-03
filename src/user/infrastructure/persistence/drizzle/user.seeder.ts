import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/shared/infrastructure/database/database.types";
import { PasswordHasher } from "@/user/application/service/password-hasher";
import { userTable } from "@/user/infrastructure/persistence/drizzle/schema";

export interface UserSeedResult {
  readonly admin_user_id: number | null;
}

export class UserSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<UserSeedResult> {
    const passwordHasher = new PasswordHasher();
    const password_hash = await passwordHasher.hash("AdminPassword2026!");

    await this.db
      .insert(userTable)
      .values([
        {
          email: "admin.local@rimac.test",
          full_name: "Admin Local",
          google_sub: null,
          password_hash,
          provider: "local",
          role: "admin",
          status: "active",
        },
        {
          email: "operador.local@rimac.test",
          full_name: "Operador Local",
          google_sub: null,
          password_hash,
          provider: "local",
          role: "operador",
          status: "active",
        },
      ])
      .onConflictDoNothing({
        target: userTable.email,
      });

    const admin = await this.db.query.userTable.findFirst({
      where: eq(userTable.email, "admin.local@rimac.test"),
    });

    return {
      admin_user_id: admin?.id ?? null,
    };
  }
}

export async function seedUsers(db: AppDatabase): Promise<UserSeedResult> {
  return new UserSeeder(db).run();
}
