import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("Bus Impl API")
    .setDescription("API de negocio actualizada a 2026")
    .setVersion("2026.06")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
    },
  });

  app.use(
    "/reference",
    apiReference({
      content: document,
      theme: "default",
      metaData: {
        title: "Bus Impl API",
      },
    }),
  );

  return document;
}
