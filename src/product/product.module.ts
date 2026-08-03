import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/shared/infrastructure/database/database.module";
import { PRODUCT_REPOSITORY } from "./application/repositories/product.repository.token";
import { ProductApplicationService } from "./application/service/product.application-service";
import { ProductController } from "./infrastructure/http/controllers/product.controller";
import { ProductRepository } from "./infrastructure/persistence/drizzle/product.repository";

@Module({
  imports: [DatabaseModule],
  controllers: [ProductController],
  providers: [
    ProductApplicationService,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductRepository,
    },
  ],
})
export class ProductModule {}
