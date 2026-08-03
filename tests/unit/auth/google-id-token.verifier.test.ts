import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { jwtVerify } from "jose";
import { GoogleIdTokenVerifier } from "@/auth/application/security/google-id-token.verifier";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => ({ mocked: true })),
  jwtVerify: vi.fn(),
}));

describe("GoogleIdTokenVerifier", () => {
  const jwtVerifyMock = vi.mocked(jwtVerify);
  const googleClientId = "client-id.apps.googleusercontent.com";

  function createConfigService(
    overrides: Partial<EnvironmentVariables> = {},
  ): ConfigService<EnvironmentVariables, true> {
    return {
      get: vi.fn(
        (key: keyof EnvironmentVariables) =>
          ({
            GOOGLE_CLIENT_ID: googleClientId,
            ...overrides,
          })[key],
      ),
    } as unknown as ConfigService<EnvironmentVariables, true>;
  }

  beforeEach(() => {
    jwtVerifyMock.mockReset();
  });

  it("valida id_token de Google con email verificado", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "google-sub-123",
        email: "google@rimac.com",
        email_verified: true,
        name: "Google Rimac",
      },
      protectedHeader: { alg: "RS256" },
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    const verifier = new GoogleIdTokenVerifier(createConfigService());
    const payload = await verifier.verify("valid-token");

    expect(jwtVerifyMock).toHaveBeenCalledWith(
      "valid-token",
      expect.anything(),
      expect.objectContaining({
        audience: "client-id.apps.googleusercontent.com",
        issuer: ["https://accounts.google.com", "accounts.google.com"],
      }),
    );
    expect(payload.email).toBe("google@rimac.com");
  });

  it("rechaza email no verificado", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "google-sub-123",
        email: "google@rimac.com",
        email_verified: false,
      },
      protectedHeader: { alg: "RS256" },
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    const verifier = new GoogleIdTokenVerifier(createConfigService());

    await expect(verifier.verify("valid-token")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rechaza token invalido", async () => {
    jwtVerifyMock.mockRejectedValue(new Error("invalid"));

    const verifier = new GoogleIdTokenVerifier(createConfigService());

    await expect(verifier.verify("invalid-token")).rejects.toThrow("Google id_token invalido");
  });

  it("falla rapido si GOOGLE_CLIENT_ID no existe", async () => {
    const verifier = new GoogleIdTokenVerifier(
      createConfigService({ GOOGLE_CLIENT_ID: undefined }),
    );

    await expect(verifier.verify("valid-token")).rejects.toThrow("GOOGLE_CLIENT_ID");
  });
});
