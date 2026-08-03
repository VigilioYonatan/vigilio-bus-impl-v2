import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ProductIndexQueryDto } from "@/product/application/dtos/product-index.request.dto";
import type { ProductIndexResponseDto } from "@/product/application/dtos/product-index.response.dto";
import type { ProductShowResponseDto } from "@/product/application/dtos/product-show.response.dto";
import type { ProductStoreRequestDto } from "@/product/application/dtos/product-store.request.dto";
import type { ProductUpdateRequestDto } from "@/product/application/dtos/product-update.request.dto";
import type { IProductRepository } from "@/product/application/repositories/product.repository.interface";
import { DRIZZLE_DB } from "@/shared/infrastructure/database/database.constants";
import { productTable } from "./schema";

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  async index(query: ProductIndexQueryDto): Promise<ProductIndexResponseDto> {
    const filters = this.buildIndexFilters(query);
    const rows = await this.db
      .select()
      .from(productTable)
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

  async findById(id: number): Promise<ProductShowResponseDto["product"] | null> {
    const [row] = await this.db.select().from(productTable).where(eq(productTable.id, id)).limit(1);

    return row ?? null;
  }

  async findBySku(sku: string): Promise<ProductShowResponseDto["product"] | null> {
    const [row] = await this.db
      .select()
      .from(productTable)
      .where(eq(productTable.sku, sku))
      .limit(1);

    return row ?? null;
  }

  async store(body: ProductStoreRequestDto): Promise<ProductShowResponseDto["product"]> {
    const [row] = await this.db.insert(productTable).values(body).returning();

    if (!row) {
      throw new Error("No se pudo persistir el producto");
    }

    return row;
  }

  async update(
    id: number,
    body: ProductUpdateRequestDto,
  ): Promise<ProductShowResponseDto["product"] | null> {
    const [row] = await this.db
      .update(productTable)
      .set({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .where(eq(productTable.id, id))
      .returning();

    return row ?? null;
  }

  async destroy(id: number): Promise<boolean> {
    const [row] = await this.db
      .delete(productTable)
      .where(eq(productTable.id, id))
      .returning({ id: productTable.id });

    return Boolean(row);
  }

  private buildIndexFilters(query: ProductIndexQueryDto): SQL[] {
    const filters: SQL[] = [];

    if (query.search) {
      const search = `%${query.search}%`;
      const searchFilter = or(ilike(productTable.sku, search), ilike(productTable.nombre, search));

      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    if (query.sku) {
      filters.push(eq(productTable.sku, query.sku));
    }

    if (query.status) {
      filters.push(eq(productTable.status, query.status));
    }

    return filters;
  }
}
