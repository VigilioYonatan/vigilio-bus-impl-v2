import { userStoreRequestDto } from "@/user/application/dtos/user-store.request.dto";

describe("userStoreRequestDto", () => {
  it("acepta un usuario valido y aplica defaults", () => {
    const result = userStoreRequestDto.safeParse({
      email: "ADMIN@RIMAC.COM",
      full_name: "Admin Rimac",
      password: "super-secure-password",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.email).toBe("admin@rimac.com");
      expect(result.data.role).toBe("operador");
      expect(result.data.status).toBe("active");
    }
  });

  it("rechaza passwords debiles", () => {
    const result = userStoreRequestDto.safeParse({
      email: "admin@rimac.com",
      full_name: "Admin Rimac",
      password: "123",
    });

    expect(result.success).toBe(false);
  });
});
