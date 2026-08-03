import { RequestMethod } from "@nestjs/common";
// El subpath necesita extension explicita: `@nestjs/common` no declara "exports",
// asi que sin `.js` el import falla en ESM aunque TypeScript lo acepte.
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants.js";

export type RegisteredRoute = {
  method: string;
  path: string;
};

type ControllerWrapper = { metatype?: unknown };
type ModuleRef = { controllers: Map<unknown, ControllerWrapper> };
type ContainerAware = { container: { getModules(): Map<string, ModuleRef> } };

/**
 * Enumera las rutas HTTP a partir de la metadata de los controllers.
 *
 * NestJS no publica un listador de rutas estable, asi que esto lee las mismas
 * claves de metadata que usa el router interno. Es un acoplamiento consciente y
 * esta aislado aqui por dos razones:
 *
 * 1. La alternativa anterior recorria `server._router.stack`, API privada de
 *    Express que desaparecio en Express 5.
 * 2. `route-inspector.test.ts` verifica que `PATH_METADATA` y `METHOD_METADATA`
 *    siguen valiendo `path` y `method`. Si una version de NestJS los cambia,
 *    falla un test en CI en vez de romperse el arranque en produccion.
 */
export function collectRegisteredRoutes(app: unknown): RegisteredRoute[] {
  const routes: RegisteredRoute[] = [];
  const modules = (app as ContainerAware).container.getModules();

  for (const moduleRef of modules.values()) {
    for (const wrapper of moduleRef.controllers.values()) {
      const controller = wrapper.metatype;

      if (typeof controller !== "function") {
        continue;
      }

      const controllerPath = (Reflect.getMetadata(PATH_METADATA, controller) as string) ?? "";
      const prototype = controller.prototype as Record<string, unknown>;

      for (const property of Object.getOwnPropertyNames(prototype)) {
        if (property === "constructor") {
          continue;
        }

        const handler = prototype[property];

        if (typeof handler !== "function") {
          continue;
        }

        const handlerPath = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
        const methodIndex = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;

        if (handlerPath === undefined || methodIndex === undefined) {
          continue;
        }

        routes.push({
          method: RequestMethod[methodIndex] ?? "GET",
          path: normalizePath(controllerPath, handlerPath),
        });
      }
    }
  }

  return routes.sort((left, right) => left.path.localeCompare(right.path));
}

function normalizePath(controllerPath: string, handlerPath: string): string {
  const segments = [controllerPath, handlerPath].filter((segment) => segment && segment !== "/");

  return `/${segments.join("/")}`.replace(/\/+/g, "/");
}

/** Claves de metadata que este modulo asume. Se verifican en el test. */
export const NEST_METADATA_KEYS = {
  path: PATH_METADATA,
  method: METHOD_METADATA,
} as const;
