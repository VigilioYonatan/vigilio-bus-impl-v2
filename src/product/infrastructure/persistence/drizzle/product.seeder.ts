import type { AppDatabase } from "@/shared/infrastructure/database/database.types";
import { productTable } from "./schema";

export class ProductSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    await this.db
      .insert(productTable)
      .values([
        {
          descripcion: "Producto demo para desarrollo local y smoke testing.",
          nombre: "Seguro Vehicular Local",
          precio: "129.90",
          sku: "LOCAL-VEH-001",
          status: "active",
          stock: 100,
        },
        {
          descripcion: "Producto demo para validar paginacion y busquedas.",
          nombre: "Seguro Salud Local",
          precio: "89.50",
          sku: "LOCAL-SALUD-001",
          status: "active",
          stock: 50,
        },
      ])
      .onConflictDoNothing({
        target: productTable.sku,
      });
  }
}

export async function seedProducts(db: AppDatabase): Promise<void> {
  await new ProductSeeder(db).run();
}
