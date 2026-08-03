import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";
import type { UserIndexQueryDto } from "@/user/application/dtos/user-index.request.dto";
import type { UserIndexResponseDto } from "@/user/application/dtos/user-index.response.dto";
import type {
  IUserRepository,
  UserPublicDto,
  UserRepositoryStoreDto,
  UserRepositoryUpdateDto,
} from "@/user/application/repositories/user.repository.interface";
import type { UserSchema } from "@/user/application/schemas/user.schema";
import { userTable } from "./schema";

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  async index(query: UserIndexQueryDto): Promise<UserIndexResponseDto> {
    const filters = this.buildIndexFilters(query);
    const rows = await this.db
      .select(this.publicColumns())
      .from(userTable)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .limit(query.limit)
      .offset(query.offset);

    return {
      success: true,
      count: rows.length,
      next: null,
      previous: null,
      results: rows,
    };
  }

  async findById(id: number): Promise<UserPublicDto | null> {
    const [row] = await this.db
      .select(this.publicColumns())
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByEmail(email: string): Promise<UserSchema | null> {
    const [row] = await this.db.select().from(userTable).where(eq(userTable.email, email)).limit(1);

    return row ?? null;
  }

  async findByGoogleSub(google_sub: string): Promise<UserSchema | null> {
    const [row] = await this.db
      .select()
      .from(userTable)
      .where(eq(userTable.google_sub, google_sub))
      .limit(1);

    return row ?? null;
  }

  async store(body: UserRepositoryStoreDto): Promise<UserPublicDto> {
    const [row] = await this.db.insert(userTable).values(body).returning(this.publicColumns());

    if (!row) {
      throw new Error("No se pudo persistir el usuario");
    }

    return row;
  }

  async update(id: number, body: UserRepositoryUpdateDto): Promise<UserPublicDto | null> {
    const [row] = await this.db
      .update(userTable)
      .set({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .where(eq(userTable.id, id))
      .returning(this.publicColumns());

    return row ?? null;
  }

  async destroy(id: number): Promise<boolean> {
    const [row] = await this.db
      .delete(userTable)
      .where(eq(userTable.id, id))
      .returning({ id: userTable.id });

    return Boolean(row);
  }

  private buildIndexFilters(query: UserIndexQueryDto): SQL[] {
    const filters: SQL[] = [];

    if (query.search) {
      const search = `%${query.search}%`;
      const searchFilter = or(ilike(userTable.email, search), ilike(userTable.full_name, search));

      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    if (query.role) {
      filters.push(eq(userTable.role, query.role));
    }

    if (query.status) {
      filters.push(eq(userTable.status, query.status));
    }

    if (query.provider) {
      filters.push(eq(userTable.provider, query.provider));
    }

    return filters;
  }

  private publicColumns() {
    return {
      id: userTable.id,
      email: userTable.email,
      full_name: userTable.full_name,
      role: userTable.role,
      status: userTable.status,
      provider: userTable.provider,
      google_sub: userTable.google_sub,
      created_at: userTable.created_at,
      updated_at: userTable.updated_at,
    };
  }
}
