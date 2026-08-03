import type { ProductIndexQueryDto } from "../dtos/product-index.request.dto";
import type { ProductIndexResponseDto } from "../dtos/product-index.response.dto";
import type { ProductShowResponseDto } from "../dtos/product-show.response.dto";
import type { ProductStoreRequestDto } from "../dtos/product-store.request.dto";
import type { ProductUpdateRequestDto } from "../dtos/product-update.request.dto";

export interface IProductRepository {
  index(query: ProductIndexQueryDto): Promise<ProductIndexResponseDto>;
  findById(id: number): Promise<ProductShowResponseDto["product"] | null>;
  findBySku(sku: string): Promise<ProductShowResponseDto["product"] | null>;
  store(body: ProductStoreRequestDto): Promise<ProductShowResponseDto["product"]>;
  update(
    id: number,
    body: ProductUpdateRequestDto,
  ): Promise<ProductShowResponseDto["product"] | null>;
  destroy(id: number): Promise<boolean>;
}
