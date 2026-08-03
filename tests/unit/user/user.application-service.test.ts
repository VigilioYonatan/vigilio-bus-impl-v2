import type { IUserRepository } from "@/user/application/repositories/user.repository.interface";
import type { UserSchema } from "@/user/application/schemas/user.schema";
import { PasswordHasher } from "@/user/application/service/password-hasher";
import { UserApplicationService } from "@/user/application/service/user.application-service";

const now = "2026-07-11T00:00:00.000Z";

function user(overrides: Partial<UserSchema> = {}) {
  const value: UserSchema = {
    id: 1,
    email: "admin@rimac.com",
    full_name: "Admin Rimac",
    role: "operador",
    status: "active",
    provider: "local",
    google_sub: null,
    password_hash: "hash",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
  const { password_hash: _, ...publicUser } = value;
  return { publicUser, value };
}

function repository(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    index: vi.fn().mockResolvedValue({
      success: true,
      count: 0,
      next: null,
      previous: null,
      results: [],
    }),
    findById: vi.fn().mockResolvedValue(user().publicUser),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByGoogleSub: vi.fn().mockResolvedValue(null),
    store: vi.fn().mockResolvedValue(user().publicUser),
    update: vi.fn().mockResolvedValue(user().publicUser),
    destroy: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("UserApplicationService", () => {
  it("delega index y retorna show sin password_hash", async () => {
    const repo = repository();
    const service = new UserApplicationService(repo, new PasswordHasher());
    const query = {
      limit: 10,
      offset: 0,
      sort_by: "created_at" as const,
      sort_dir: "desc" as const,
    };

    await expect(service.index(query)).resolves.toEqual(expect.objectContaining({ success: true }));
    const response = await service.show(1);
    expect(response.user.email).toBe("admin@rimac.com");
    expect("password_hash" in response.user).toBe(false);
  });

  it("rechaza operaciones sobre usuarios inexistentes", async () => {
    const service = new UserApplicationService(
      repository({
        findById: vi.fn().mockResolvedValue(null),
        destroy: vi.fn().mockResolvedValue(false),
      }),
      new PasswordHasher(),
    );

    await expect(service.show(99)).rejects.toThrow("Usuario no encontrado");
    await expect(service.update(99, { full_name: "Otro Usuario" })).rejects.toThrow(
      "Usuario no encontrado",
    );
    await expect(service.destroy(99)).rejects.toThrow("Usuario no encontrado");
  });

  it("crea usuario local con password hasheado", async () => {
    const repo = repository();
    const hasher = { hash: vi.fn().mockResolvedValue("scrypt:hash") } as unknown as PasswordHasher;
    const service = new UserApplicationService(repo, hasher);

    await expect(
      service.store({
        email: "admin@rimac.com",
        full_name: "Admin Rimac",
        password: "super-secure-password",
        role: "operador",
        status: "active",
      }),
    ).resolves.toEqual({ success: true, user: user().publicUser });
    expect(repo.store).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "local",
        google_sub: null,
        password_hash: "scrypt:hash",
      }),
    );
  });

  it("rechaza email duplicado al crear o cambiar email", async () => {
    const repo = repository({ findByEmail: vi.fn().mockResolvedValue(user().value) });
    const service = new UserApplicationService(repo, new PasswordHasher());

    await expect(
      service.store({
        email: "admin@rimac.com",
        full_name: "Admin Rimac",
        password: "super-secure-password",
        role: "operador",
        status: "active",
      }),
    ).rejects.toThrow("El email ya esta registrado");
    await expect(service.update(1, { email: "duplicado@rimac.com" })).rejects.toThrow(
      "El email ya esta registrado",
    );
  });

  it("construye update parcial, rehashea password y fuerza provider local", async () => {
    const repo = repository();
    const hasher = { hash: vi.fn().mockResolvedValue("new-hash") } as unknown as PasswordHasher;
    const service = new UserApplicationService(repo, hasher);

    await service.update(1, {
      email: "nuevo@rimac.com",
      full_name: "Nuevo Nombre",
      role: "admin",
      status: "blocked",
      password: "another-secure-password",
    });

    expect(repo.update).toHaveBeenCalledWith(1, {
      email: "nuevo@rimac.com",
      full_name: "Nuevo Nombre",
      role: "admin",
      status: "blocked",
      password_hash: "new-hash",
      provider: "local",
    });
  });

  it("detecta race en update y elimina usuario existente", async () => {
    const repo = repository({ update: vi.fn().mockResolvedValue(null) });
    const service = new UserApplicationService(repo, new PasswordHasher());

    await expect(service.update(1, {})).rejects.toThrow("Usuario no encontrado");
    await expect(service.destroy(1)).resolves.toEqual({
      success: true,
      message: "Usuario eliminado correctamente",
    });
  });
});
