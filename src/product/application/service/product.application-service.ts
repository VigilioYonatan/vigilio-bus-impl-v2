import { ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { ProductDestroyResponseDto } from "../dtos/product-destroy.response.dto";
import type { ProductIndexQueryDto } from "../dtos/product-index.request.dto";
import type { ProductIndexResponseDto } from "../dtos/product-index.response.dto";
import type { ProductShowResponseDto } from "../dtos/product-show.response.dto";
import type { ProductStoreRequestDto } from "../dtos/product-store.request.dto";
import type { ProductStoreResponseDto } from "../dtos/product-store.response.dto";
import type { ProductUpdateRequestDto } from "../dtos/product-update.request.dto";
import type { ProductUpdateResponseDto } from "../dtos/product-update.response.dto";
import type { IProductRepository } from "../repositories/product.repository.interface";
import { PRODUCT_REPOSITORY } from "../repositories/product.repository.token";

@Injectable()
export class ProductApplicationService {
  private readonly logger = new Logger(ProductApplicationService.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repository: IProductRepository,
  ) {}

  async index(query: ProductIndexQueryDto): Promise<ProductIndexResponseDto> {
    this.logger.log({ action: "product.index", query }, "Indexing products");
    return this.repository.index(query);
  }

  async show(id: number): Promise<ProductShowResponseDto> {
    const product = await this.repository.findById(id);

    if (!product) {
      throw new NotFoundException("Producto no encontrado");
    }

    return {
      success: true,
      product,
    };
  }

  async store(body: ProductStoreRequestDto): Promise<ProductStoreResponseDto> {
    await this.ensureSkuIsAvailable(body.sku);

    const product = await this.repository.store(body);
    this.logger.log({ action: "product.store", product_id: product.id }, "Stored product");

    return {
      success: true,
      product,
    };
  }

  async update(id: number, body: ProductUpdateRequestDto): Promise<ProductUpdateResponseDto> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundException("Producto no encontrado");
    }

    if (body.sku && body.sku !== existing.sku) {
      await this.ensureSkuIsAvailable(body.sku);
    }

    const product = await this.repository.update(id, body);

    if (!product) {
      throw new NotFoundException("Producto no encontrado");
    }

    this.logger.log({ action: "product.update", product_id: id }, "Updated product");

    return {
      success: true,
      product,
    };
  }

  async destroy(id: number): Promise<ProductDestroyResponseDto> {
    const deleted = await this.repository.destroy(id);

    if (!deleted) {
      throw new NotFoundException("Producto no encontrado");
    }

    this.logger.log({ action: "product.destroy", product_id: id }, "Destroyed product");

    return {
      success: true,
      message: "Producto eliminado correctamente",
    };
  }

  private async ensureSkuIsAvailable(sku: string): Promise<void> {
    const existing = await this.repository.findBySku(sku);

    if (existing) {
      throw new ConflictException("El sku ya esta registrado");
    }
  }
}
