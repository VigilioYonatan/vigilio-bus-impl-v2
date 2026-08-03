import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { AuthTokenService } from "@/auth/application/security/auth-token.service";
import type { AuthenticatedRequest } from "@/shared/infrastructure/security/authenticated-request";
import { JwtAuthGuard } from "@/shared/infrastructure/security/jwt-auth.guard";

function executionContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard", () => {
  it("permite rutas publicas sin verificar token", async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(true) } as unknown as Reflector;
    const tokenService = { verify: vi.fn() } as unknown as AuthTokenService;
    const guard = new JwtAuthGuard(reflector, tokenService);

    await expect(
      guard.canActivate(executionContext({ headers: {} } as AuthenticatedRequest)),
    ).resolves.toBe(true);
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    "Basic abc",
    "Bearer",
    "bearer token",
  ])("rechaza authorization invalido: %s", async (authorization) => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const tokenService = { verify: vi.fn() } as unknown as AuthTokenService;
    const guard = new JwtAuthGuard(reflector, tokenService);
    const request = { headers: { authorization } } as AuthenticatedRequest;

    await expect(guard.canActivate(executionContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it("verifica access token y adjunta identidad confiable", async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
    const tokenService = {
      verify: vi.fn().mockResolvedValue({
        sub: "42",
        email: "admin@rimac.com",
        role: "admin",
        typ: "access",
      }),
    } as unknown as AuthTokenService;
    const guard = new JwtAuthGuard(reflector, tokenService);
    const request = {
      headers: { authorization: "Bearer signed-token" },
    } as AuthenticatedRequest;

    await expect(guard.canActivate(executionContext(request))).resolves.toBe(true);
    expect(tokenService.verify).toHaveBeenCalledWith("signed-token", "access");
    expect(request.user).toEqual({ id: 42, email: "admin@rimac.com", role: "admin" });
  });
});
