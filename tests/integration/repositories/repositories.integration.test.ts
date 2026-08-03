import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ProductRepository } from "@/product/infrastructure/persistence/drizzle/product.repository";
import * as productSchema from "@/product/infrastructure/persistence/drizzle/schema";
import * as userSchema from "@/user/infrastructure/persistence/drizzle/schema";
import { UserRepository } from "@/user/infrastructure/persistence/drizzle/user.repository";

function localPostgresUrl(database: string): string {
  const url = new URL("postgres://127.0.0.1:5432");
  url.username = "postgres";
  url.password = "postgres";
  url.pathname = database;
  return url.toString();
}

const { E2E_DATABASE_URL: e2eDatabaseUrl } = process.env;
const databaseUrl = e2eDatabaseUrl ?? localPostgresUrl("bus_impl_e2e");

const schema = {
  ...productSchema,
  ...userSchema,
};

describe("repositories with PostgreSQL", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  const userRepository = new UserRepository(
    db as unknown as ConstructorParameters<typeof UserRepository>[0],
  );
  const productRepository = new ProductRepository(
    db as unknown as ConstructorParameters<typeof ProductRepository>[0],
  );

  afterAll(async () => {
    await pool.end();
  });

  it("persiste usuario sin exponer password_hash en responses publicas", async () => {
    const email = `integration-${Date.now()}@rimac.com`;
    const user = await userRepository.store({
      email,
      full_name: "Usuario Integration",
      role: "operador",
      status: "active",
      provider: "local",
      google_sub: null,
      password_hash: "scrypt:v1:salt:key",
    });

    expect(user.email).toBe(email);
    expect("password_hash" in user).toBe(false);

    const persisted = await userRepository.findByEmail(email);
    expect(persisted?.password_hash).toBe("scrypt:v1:salt:key");
  });

  it("persiste producto con numeric string exacto", async () => {
    const sku = `INT-${Date.now()}`;
    const product = await productRepository.store({
      sku,
      nombre: "Producto Integration",
      descripcion: null,
      precio: "199.90",
      stock: 3,
    });

    expect(product.sku).toBe(sku);
    expect(product.precio).toBe("199.90");
    expect(product.status).toBe("active");

    const indexed = await productRepository.index({
      limit: 10,
      offset: 0,
      search: sku,
      sort_by: "created_at",
      sort_dir: "desc",
    });

    expect(indexed.results).toContainEqual(expect.objectContaining({ sku, precio: "199.90" }));
  });

  it("mantiene unicidad de email y SKU en PostgreSQL ante carreras", async () => {
    const suffix = randomUUID();
    const email = `unique-${suffix}@rimac.com`;
    const sku = `UNQ-${suffix}`;
    const user = {
      email,
      full_name: "Usuario Unique",
      role: "operador" as const,
      status: "active" as const,
      provider: "local" as const,
      google_sub: null,
      password_hash: "scrypt:v1:salt:key",
    };
    const product = {
      sku,
      nombre: "Producto Unique",
      descripcion: null,
      precio: "10.00",
      stock: 1,
    };

    await userRepository.store(user);
    await productRepository.store(product);

    await expect(userRepository.store(user)).rejects.toThrow();
    await expect(productRepository.store(product)).rejects.toThrow();
  });
});
