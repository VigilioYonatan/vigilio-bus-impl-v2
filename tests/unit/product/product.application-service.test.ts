import type { IProductRepository } from "@/product/application/repositories/product.repository.interface";
import type { ProductSchema } from "@/product/application/schemas/product.schema";
import { ProductApplicationService } from "@/product/application/service/product.application-service";

const now = "2026-07-11T00:00:00.000Z";

function product(overrides: Partial<ProductSchema> = {}): ProductSchema {
  return {
    id: 1,
    sku: "SALUD-001",
    nombre: "Plan Salud",
    descripcion: null,
    precio: "129.90",
    stock: 10,
    status: "active",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function repository(overrides: Partial<IProductRepository> = {}): IProductRepository {
  return {
    index: vi.fn().mockResolvedValue({
      success: true,
      count: 0,
      next: null,
      previous: null,
      results: [],
    }),
    findById: vi.fn().mockResolvedValue(product()),
    findBySku: vi.fn().mockResolvedValue(null),
    store: vi.fn().mockResolvedValue(product()),
    update: vi.fn().mockResolvedValue(product()),
    destroy: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("ProductApplicationService", () => {
  it("delega index y retorna show", async () => {
    const repo = repository();
    const service = new ProductApplicationService(repo);
    const query = {
      limit: 10,
      offset: 0,
      sort_by: "created_at" as const,
      sort_dir: "desc" as const,
    };

    await expect(service.index(query)).resolves.toEqual(expect.objectContaining({ success: true }));
    await expect(service.show(1)).resolves.toEqual({ success: true, product: product() });
    expect(repo.index).toHaveBeenCalledWith(query);
  });

  it("rechaza show, update y destroy cuando el producto no existe", async () => {
    const service = new ProductApplicationService(
      repository({
        findById: vi.fn().mockResolvedValue(null),
        destroy: vi.fn().mockResolvedValue(false),
      }),
    );

    await expect(service.show(99)).rejects.toThrow("Producto no encontrado");
    await expect(service.update(99, { nombre: "Nuevo nombre" })).rejects.toThrow(
      "Producto no encontrado",
    );
    await expect(service.destroy(99)).rejects.toThrow("Producto no encontrado");
  });

  it("crea un producto cuando el SKU esta disponible", async () => {
    const repo = repository();
    const service = new ProductApplicationService(repo);
    const body = {
      sku: "SALUD-001",
      nombre: "Plan Salud",
      descripcion: null,
      precio: "129.90",
      stock: 10,
    };

    await expect(service.store(body)).resolves.toEqual({ success: true, product: product() });
    expect(repo.findBySku).toHaveBeenCalledWith(body.sku);
    expect(repo.store).toHaveBeenCalledWith(body);
  });

  it("rechaza SKU duplicado al crear o cambiar SKU", async () => {
    const repo = repository({ findBySku: vi.fn().mockResolvedValue(product()) });
    const service = new ProductApplicationService(repo);

    await expect(
      service.store({
        sku: "SALUD-001",
        nombre: "Plan Salud",
        descripcion: null,
        precio: "129.90",
        stock: 10,
      }),
    ).rejects.toThrow("El sku ya esta registrado");
    await expect(service.update(1, { sku: "SALUD-002" })).rejects.toThrow(
      "El sku ya esta registrado",
    );
  });

  it("actualiza sin consultar SKU cuando no cambia y detecta delete races", async () => {
    const repo = repository({ update: vi.fn().mockResolvedValue(null) });
    const service = new ProductApplicationService(repo);

    await expect(service.update(1, { sku: "SALUD-001", stock: 20 })).rejects.toThrow(
      "Producto no encontrado",
    );
    expect(repo.findBySku).not.toHaveBeenCalled();
  });

  it("actualiza y elimina productos existentes", async () => {
    const updated = product({ stock: 20 });
    const repo = repository({ update: vi.fn().mockResolvedValue(updated) });
    const service = new ProductApplicationService(repo);

    await expect(service.update(1, { stock: 20 })).resolves.toEqual({
      success: true,
      product: updated,
    });
    await expect(service.destroy(1)).resolves.toEqual({
      success: true,
      message: "Producto eliminado correctamente",
    });
  });
});
