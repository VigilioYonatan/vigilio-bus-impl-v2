import { AuthTokenService } from "@/auth/application/security/auth-token.service";
import type { GoogleIdTokenVerifier } from "@/auth/application/security/google-id-token.verifier";
import {
  AuthApplicationService,
  type AuthRequestContext,
} from "@/auth/application/service/auth.application-service";
import type { IUserRepository } from "@/user/application/repositories/user.repository.interface";
import type { UserSchema } from "@/user/application/schemas/user.schema";
import { PasswordHasher } from "@/user/application/service/password-hasher";
import { FakeAuthSessionRepository } from "./auth-session.repository.fake";

const now = "2026-06-09T00:00:00.000Z";
const context: AuthRequestContext = { ip_address: "203.0.113.10", user_agent: "vitest" };

function createUser(overrides: Partial<UserSchema> = {}): UserSchema {
  return {
    id: 1,
    email: "admin@rimac.com",
    full_name: "Admin Rimac",
    role: "operador",
    status: "active",
    provider: "local",
    google_sub: null,
    password_hash: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function createPublicUser(overrides: Partial<UserSchema> = {}) {
  const user = createUser(overrides);

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    status: user.status,
    provider: user.provider,
    google_sub: user.google_sub,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function createUserRepository(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    index: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByGoogleSub: vi.fn(),
    store: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    ...overrides,
  };
}

function createService(options: {
  userRepository: IUserRepository;
  sessionRepository?: FakeAuthSessionRepository;
  authTokenService?: AuthTokenService;
  googleVerifier?: Partial<GoogleIdTokenVerifier>;
  passwordHasher?: PasswordHasher;
}) {
  const sessionRepository = options.sessionRepository ?? new FakeAuthSessionRepository();
  const authTokenService = options.authTokenService ?? new AuthTokenService();
  const service = new AuthApplicationService(
    options.userRepository,
    options.passwordHasher ?? new PasswordHasher(),
    authTokenService,
    (options.googleVerifier ?? { verify: vi.fn() }) as unknown as GoogleIdTokenVerifier,
    sessionRepository,
  );

  return { service, sessionRepository, authTokenService };
}

describe("AuthApplicationService", () => {
  it("registra usuario normal y retorna tokens sin password_hash", async () => {
    const userRepository = createUserRepository({
      findByEmail: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockImplementation(async (body) =>
        createPublicUser({
          email: body.email,
          full_name: body.full_name,
          role: body.role,
          status: body.status,
          provider: body.provider,
          google_sub: body.google_sub ?? null,
          password_hash: null,
        }),
      ),
    });
    const { service } = createService({ userRepository });

    const response = await service.register(
      {
        email: "admin@rimac.com",
        full_name: "Admin Rimac",
        password: "super-secure-password",
      },
      context,
    );

    expect(userRepository.store).toHaveBeenCalled();
    expect(response.success).toBe(true);
    expect(response.token_type).toBe("Bearer");
    expect(response.access_token.length).toBeGreaterThan(20);
    expect(response.refresh_token.length).toBeGreaterThan(20);
    expect("password_hash" in response.user).toBe(false);

    const payload = await new AuthTokenService().verify(response.access_token, "access");
    expect(payload.email).toBe("admin@rimac.com");
  });

  it("loguea usuario normal con password valido", async () => {
    const passwordHasher = new PasswordHasher();
    const password_hash = await passwordHasher.hash("super-secure-password");
    const userRepository = createUserRepository({
      findByEmail: vi.fn().mockResolvedValue(createUser({ password_hash })),
    });
    const { service } = createService({ userRepository, passwordHasher });

    const response = await service.login(
      { email: "admin@rimac.com", password: "super-secure-password" },
      context,
    );

    expect(response.success).toBe(true);
    expect(response.user.email).toBe("admin@rimac.com");
  });

  it("rechaza login con password invalido", async () => {
    const passwordHasher = new PasswordHasher();
    const password_hash = await passwordHasher.hash("super-secure-password");
    const userRepository = createUserRepository({
      findByEmail: vi.fn().mockResolvedValue(createUser({ password_hash })),
    });
    const { service } = createService({ userRepository, passwordHasher });

    await expect(
      service.login({ email: "admin@rimac.com", password: "wrong-password" }, context),
    ).rejects.toThrow("Credenciales invalidas");
  });

  it("bloquea el login tras superar el umbral de intentos por email", async () => {
    const passwordHasher = new PasswordHasher();
    const password_hash = await passwordHasher.hash("super-secure-password");
    const userRepository = createUserRepository({
      findByEmail: vi.fn().mockResolvedValue(createUser({ password_hash })),
    });
    const { service } = createService({ userRepository, passwordHasher });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.login({ email: "admin@rimac.com", password: "wrong-password" }, context),
      ).rejects.toThrow("Credenciales invalidas");
    }

    // El sexto intento ya no llega a comparar la password: corta el rate limit.
    await expect(
      service.login({ email: "admin@rimac.com", password: "super-secure-password" }, context),
    ).rejects.toThrow("Demasiados intentos fallidos");
  });

  it("limpia los intentos fallidos tras un login correcto", async () => {
    const passwordHasher = new PasswordHasher();
    const password_hash = await passwordHasher.hash("super-secure-password");
    const userRepository = createUserRepository({
      findByEmail: vi.fn().mockResolvedValue(createUser({ password_hash })),
    });
    const { service, sessionRepository } = createService({ userRepository, passwordHasher });

    await expect(
      service.login({ email: "admin@rimac.com", password: "wrong-password" }, context),
    ).rejects.toThrow("Credenciales invalidas");

    await service.login({ email: "admin@rimac.com", password: "super-secure-password" }, context);

    const attempts = await sessionRepository.countLoginAttempts({
      email: "admin@rimac.com",
      ip_address: context.ip_address,
      since: "1970-01-01T00:00:00.000Z",
    });
    expect(attempts.by_email).toBe(0);
  });

  it("no revela por temporizacion si el email existe", async () => {
    const passwordHasher = new PasswordHasher();
    const userRepository = createUserRepository({
      findByEmail: vi.fn().mockResolvedValue(null),
    });
    const { service } = createService({ userRepository, passwordHasher });
    const verifySpy = vi.spyOn(passwordHasher, "verify");

    await expect(
      service.login({ email: "noexiste@rimac.com", password: "cualquiera" }, context),
    ).rejects.toThrow("Credenciales invalidas");

    // Se verifica un hash señuelo aunque el usuario no exista.
    expect(verifySpy).toHaveBeenCalledTimes(1);
  });

  it("renueva tokens rotando el refresh y revocando el anterior", async () => {
    const user = createPublicUser();
    const userRepository = createUserRepository({
      findById: vi.fn().mockResolvedValue(user),
      findByGoogleSub: vi.fn().mockResolvedValue(createUser()),
    });
    const { service, sessionRepository, authTokenService } = createService({
      userRepository,
      googleVerifier: {
        verify: vi.fn().mockResolvedValue({
          sub: "google-sub-123",
          email: "admin@rimac.com",
          email_verified: true,
          name: "Admin Rimac",
        }),
      },
    });

    // Se emite el par inicial a traves del servicio para que quede persistido.
    const initial = await service.google({ id_token: "token" }, context);
    const initialPayload = await authTokenService.verify(initial.refresh_token, "refresh");

    const response = await service.refresh(initial.refresh_token, context);
    const rotatedPayload = await authTokenService.verify(response.refresh_token, "refresh");

    expect(response.refresh_token).not.toBe(initial.refresh_token);
    expect(sessionRepository.sessionByJti(initialPayload.jti)?.revoked_reason).toBe("rotated");
    expect(sessionRepository.sessionByJti(rotatedPayload.jti)?.revoked_at).toBeNull();
    // La rotacion conserva la familia del login original.
    expect(rotatedPayload.fam).toBe(initialPayload.fam);
  });

  it("revoca la familia completa al detectar reuso de un refresh token", async () => {
    const user = createPublicUser();
    const userRepository = createUserRepository({
      findById: vi.fn().mockResolvedValue(user),
      findByEmail: vi.fn().mockResolvedValue(null),
      findByGoogleSub: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(user),
    });
    const { service, sessionRepository } = createService({
      userRepository,
      googleVerifier: {
        verify: vi.fn().mockResolvedValue({
          sub: "google-sub-123",
          email: "admin@rimac.com",
          email_verified: true,
          name: "Admin Rimac",
        }),
      },
    });

    const initial = await service.google({ id_token: "token" }, context);
    await service.refresh(initial.refresh_token, context);

    expect(sessionRepository.activeSessionCount()).toBe(1);

    // Reusar el token ya rotado equivale a un token robado.
    await expect(service.refresh(initial.refresh_token, context)).rejects.toThrow(
      "Refresh token invalido",
    );

    // Toda la familia queda cerrada, incluida la sesion que era valida.
    expect(sessionRepository.activeSessionCount()).toBe(0);
  });

  it("rechaza un refresh token con firma valida pero sin sesion registrada", async () => {
    const user = createPublicUser();
    const authTokenService = new AuthTokenService();
    const tokens = await authTokenService.signTokenPair(user);
    const userRepository = createUserRepository({
      findById: vi.fn().mockResolvedValue(user),
    });
    const { service } = createService({ userRepository, authTokenService });

    await expect(service.refresh(tokens.refresh_token, context)).rejects.toThrow(
      "Refresh token invalido",
    );
  });

  it("revoca la sesion en logout", async () => {
    const user = createPublicUser();
    const userRepository = createUserRepository({
      findById: vi.fn().mockResolvedValue(user),
      findByGoogleSub: vi.fn().mockResolvedValue(createUser()),
    });
    const { service, sessionRepository } = createService({
      userRepository,
      googleVerifier: {
        verify: vi.fn().mockResolvedValue({
          sub: "google-sub-123",
          email: "admin@rimac.com",
          email_verified: true,
          name: "Admin Rimac",
        }),
      },
    });

    const session = await service.google({ id_token: "token" }, context);
    const response = await service.logout(session.refresh_token);

    expect(response.revoked_sessions).toBe(1);
    expect(sessionRepository.activeSessionCount()).toBe(0);

    // Un refresh posterior con ese token es reuso y debe fallar.
    await expect(service.refresh(session.refresh_token, context)).rejects.toThrow(
      "Refresh token invalido",
    );
  });

  it("revoca todas las sesiones activas en logout-all", async () => {
    const user = createPublicUser();
    const userRepository = createUserRepository({
      findById: vi.fn().mockResolvedValue(user),
      findByGoogleSub: vi.fn().mockResolvedValue(createUser()),
    });
    const { service, sessionRepository } = createService({
      userRepository,
      googleVerifier: {
        verify: vi.fn().mockResolvedValue({
          sub: "google-sub-123",
          email: "admin@rimac.com",
          email_verified: true,
          name: "Admin Rimac",
        }),
      },
    });

    await service.google({ id_token: "token" }, context);
    await service.google({ id_token: "token" }, context);
    expect(sessionRepository.activeSessionCount()).toBe(2);

    const response = await service.logoutAll(1);

    expect(response.revoked_sessions).toBe(2);
    expect(sessionRepository.activeSessionCount()).toBe(0);
  });

  it("crea usuario con Google cuando no existe", async () => {
    const userRepository = createUserRepository({
      findByEmail: vi.fn().mockResolvedValue(null),
      findByGoogleSub: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(
        createPublicUser({
          email: "google@rimac.com",
          full_name: "Google Rimac",
          provider: "google",
          google_sub: "google-sub-123",
        }),
      ),
    });
    const { service } = createService({
      userRepository,
      googleVerifier: {
        verify: vi.fn().mockResolvedValue({
          sub: "google-sub-123",
          email: "google@rimac.com",
          email_verified: true,
          name: "Google Rimac",
        }),
      },
    });

    const response = await service.google({ id_token: "valid-google-id-token-for-test" }, context);

    expect(userRepository.store).toHaveBeenCalledWith({
      email: "google@rimac.com",
      full_name: "Google Rimac",
      role: "operador",
      status: "active",
      provider: "google",
      google_sub: "google-sub-123",
      password_hash: null,
    });
    expect(response.user.provider).toBe("google");
  });

  it("loguea con Google cuando ya existe google_sub", async () => {
    const userRepository = createUserRepository({
      findByGoogleSub: vi.fn().mockResolvedValue(
        createUser({
          provider: "google",
          google_sub: "google-sub-123",
        }),
      ),
    });
    const { service } = createService({
      userRepository,
      googleVerifier: {
        verify: vi.fn().mockResolvedValue({
          sub: "google-sub-123",
          email: "admin@rimac.com",
          email_verified: true,
          name: "Admin Rimac",
        }),
      },
    });

    const response = await service.google({ id_token: "valid-google-id-token-for-test" }, context);

    expect(userRepository.store).not.toHaveBeenCalled();
    expect(response.user.google_sub).toBe("google-sub-123");
  });

  it("vincula Google cuando existe usuario por email", async () => {
    const userRepository = createUserRepository({
      findByEmail: vi.fn().mockResolvedValue(createUser()),
      findByGoogleSub: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(
        createPublicUser({
          provider: "google",
          google_sub: "google-sub-123",
        }),
      ),
    });
    const { service } = createService({
      userRepository,
      googleVerifier: {
        verify: vi.fn().mockResolvedValue({
          sub: "google-sub-123",
          email: "admin@rimac.com",
          email_verified: true,
          name: "Admin Rimac",
        }),
      },
    });

    const response = await service.google({ id_token: "valid-google-id-token-for-test" }, context);

    expect(userRepository.update).toHaveBeenCalledWith(1, {
      provider: "google",
      google_sub: "google-sub-123",
    });
    expect(response.user.provider).toBe("google");
  });

  it("rechaza refresh si el usuario esta inactivo y cierra la familia", async () => {
    const userRepository = createUserRepository({
      findById: vi.fn().mockResolvedValue(createPublicUser({ status: "inactive" })),
      findByGoogleSub: vi.fn().mockResolvedValue(createUser()),
    });
    const { service, sessionRepository } = createService({
      userRepository,
      googleVerifier: {
        verify: vi.fn().mockResolvedValue({
          sub: "google-sub-123",
          email: "admin@rimac.com",
          email_verified: true,
          name: "Admin Rimac",
        }),
      },
    });

    const session = await service.google({ id_token: "token" }, context);

    await expect(service.refresh(session.refresh_token, context)).rejects.toThrow(
      "Refresh token invalido",
    );
    expect(sessionRepository.activeSessionCount()).toBe(0);
  });

  it("detecta hash invalido y token con tipo incorrecto", async () => {
    const passwordHasher = new PasswordHasher();
    const password_hash = await passwordHasher.hash("super-secure-password");
    const authTokenService = new AuthTokenService();
    const user = createPublicUser();
    const tokens = await authTokenService.signTokenPair(user);

    await expect(authTokenService.verify(tokens.refresh_token, "access")).rejects.toThrow(
      "Tipo de token invalido",
    );
    await expect(passwordHasher.verify("wrong-password", password_hash)).resolves.toBe(false);
    await expect(passwordHasher.verify("wrong-password", "invalid")).resolves.toBe(false);
  });
});
