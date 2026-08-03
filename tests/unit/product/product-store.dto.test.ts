import { productStoreRequestDto } from "@/product/application/dtos/product-store.request.dto";

describe("productStoreRequestDto", () => {
  it("acepta un producto valido y conserva precio monetario exacto", () => {
    const result = productStoreRequestDto.safeParse({
      sku: "SALUD-001",
      nombre: "Plan Salud Empresas",
      descripcion: null,
      precio: "129.90",
      stock: 10,
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.precio).toBe("129.90");
      expect(result.data.descripcion).toBeNull();
      expect("status" in result.data).toBe(false);
    }
  });

  it("rechaza precios con mas de dos decimales", () => {
    const result = productStoreRequestDto.safeParse({
      sku: "SALUD-001",
      nombre: "Plan Salud Empresas",
      descripcion: null,
      precio: "129.999",
      stock: 10,
    });

    expect(result.success).toBe(false);
  });
});
