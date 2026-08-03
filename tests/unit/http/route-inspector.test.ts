import { Controller, Get, Post } from "@nestjs/common";
import {
  collectRegisteredRoutes,
  NEST_METADATA_KEYS,
} from "@/shared/infrastructure/http/route-inspector";

@Controller("demo")
class DemoController {
  @Get()
  index() {
    return null;
  }

  @Get(":id")
  show() {
    return null;
  }

  @Post("acciones/archivar")
  archive() {
    return null;
  }

  // Sin decorador HTTP: no debe aparecer en el listado.
  helper() {
    return null;
  }
}

function createApp(controllers: unknown[]) {
  return {
    container: {
      getModules: () =>
        new Map([
          [
            "DemoModule",
            {
              controllers: new Map(controllers.map((metatype, index) => [index, { metatype }])),
            },
          ],
        ]),
    },
  };
}

describe("collectRegisteredRoutes", () => {
  /**
   * Guarda de acoplamiento: este modulo lee metadata interna de NestJS. Si una
   * actualizacion cambia estas claves, este test falla en CI en lugar de dejar
   * que el arranque se rompa en produccion.
   */
  it("las claves de metadata de NestJS siguen siendo las esperadas", () => {
    expect(NEST_METADATA_KEYS.path).toBe("path");
    expect(NEST_METADATA_KEYS.method).toBe("method");
  });

  it("lista metodo y ruta completa de cada handler decorado", () => {
    const routes = collectRegisteredRoutes(createApp([DemoController]));

    expect(routes).toEqual([
      { method: "GET", path: "/demo" },
      { method: "GET", path: "/demo/:id" },
      { method: "POST", path: "/demo/acciones/archivar" },
    ]);
  });

  it("ignora metodos sin decorador HTTP", () => {
    const routes = collectRegisteredRoutes(createApp([DemoController]));

    expect(routes.some((route) => route.path.includes("helper"))).toBe(false);
  });

  it("tolera controllers sin metatype valido", () => {
    const routes = collectRegisteredRoutes(createApp([undefined, null, "no-es-clase"]));

    expect(routes).toEqual([]);
  });
});
