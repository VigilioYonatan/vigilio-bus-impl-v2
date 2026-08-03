import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "@/shared/infrastructure/security/authenticated-request";
import { RolesGuard } from "@/shared/infrastructure/security/roles.guard";

function context(request: AuthenticatedRequest): ExecutionContext {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("permite rutas publicas y rutas sin roles declarados", () => {
    const publicReflector = {
      getAllAndOverride: vi.fn().mockReturnValueOnce(true),
    } as unknown as Reflector;
    const unrestrictedReflector = {
      getAllAndOverride: vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(undefined),
    } as unknown as Reflector;

    expect(new RolesGuard(publicReflector).canActivate(context({} as AuthenticatedRequest))).toBe(
      true,
    );
    expect(
      new RolesGuard(unrestrictedReflector).canActivate(context({} as AuthenticatedRequest)),
    ).toBe(true);
  });

  it("permite al rol autorizado", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(["admin"]),
    } as unknown as Reflector;
    const request = {
      user: { id: 1, email: "admin@rimac.test", role: "admin" },
    } as AuthenticatedRequest;

    expect(new RolesGuard(reflector).canActivate(context(request))).toBe(true);
  });

  it("rechaza al rol sin permiso", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(["admin"]),
    } as unknown as Reflector;
    const request = {
      user: { id: 2, email: "operator@rimac.test", role: "operador" },
    } as AuthenticatedRequest;

    expect(() => new RolesGuard(reflector).canActivate(context(request))).toThrow(
      ForbiddenException,
    );
  });
});
