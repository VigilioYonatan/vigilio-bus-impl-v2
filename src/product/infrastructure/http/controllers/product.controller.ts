import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import {
  type ProductDestroyParamsDto,
  productDestroyParamsDto,
} from "@/product/application/dtos/product-destroy.request.dto";
import { ProductDestroyResponseDocDto } from "@/product/application/dtos/product-destroy.response.doc";
import type { ProductDestroyResponseDto } from "@/product/application/dtos/product-destroy.response.dto";
import { ProductIndexQueryDocDto } from "@/product/application/dtos/product-index.request.doc";
import {
  type ProductIndexQueryDto,
  productIndexQueryDto,
} from "@/product/application/dtos/product-index.request.dto";
import { ProductIndexResponseDocDto } from "@/product/application/dtos/product-index.response.doc";
import type { ProductIndexResponseDto } from "@/product/application/dtos/product-index.response.dto";
import {
  type ProductShowParamsDto,
  productShowParamsDto,
} from "@/product/application/dtos/product-show.request.dto";
import { ProductShowResponseDocDto } from "@/product/application/dtos/product-show.response.doc";
import type { ProductShowResponseDto } from "@/product/application/dtos/product-show.response.dto";
import { ProductStoreRequestDocDto } from "@/product/application/dtos/product-store.request.doc";
import {
  type ProductStoreRequestDto,
  productStoreRequestDto,
} from "@/product/application/dtos/product-store.request.dto";
import { ProductStoreResponseDocDto } from "@/product/application/dtos/product-store.response.doc";
import type { ProductStoreResponseDto } from "@/product/application/dtos/product-store.response.dto";
import { ProductUpdateRequestDocDto } from "@/product/application/dtos/product-update.request.doc";
import {
  type ProductUpdateParamsDto,
  type ProductUpdateRequestDto,
  productUpdateParamsDto,
  productUpdateRequestDto,
} from "@/product/application/dtos/product-update.request.dto";
import { ProductUpdateResponseDocDto } from "@/product/application/dtos/product-update.response.doc";
import type { ProductUpdateResponseDto } from "@/product/application/dtos/product-update.response.dto";
import { ProductApplicationService } from "@/product/application/service/product.application-service";
import {
  ApiAuthRequiredResponse,
  ApiConflictBusinessResponse,
  ApiForbiddenBusinessResponse,
  ApiResourceNotFoundResponse,
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import { ZodQueryPipe } from "@/shared/infrastructure/http/pipes/zod-query.pipe";
import { Roles } from "@/shared/infrastructure/security/roles.decorator";

@ApiTags("products")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiUnexpectedErrorResponse()
@Controller("products")
export class ProductController {
  constructor(
    @Inject(ProductApplicationService)
    private readonly service: ProductApplicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Indexar productos" })
  @ApiQuery({ type: ProductIndexQueryDocDto })
  @ApiValidationErrorResponse()
  @ZodResponse({ status: 200, type: ProductIndexResponseDocDto })
  index(
    @Query(new ZodQueryPipe(productIndexQueryDto)) query: ProductIndexQueryDto,
  ): Promise<ProductIndexResponseDto> {
    return this.service.index(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Mostrar producto" })
  @ApiParam({ name: "id", type: Number })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Producto")
  @ZodResponse({ status: 200, type: ProductShowResponseDocDto })
  show(
    @Param(new ZodPipe(productShowParamsDto)) params: ProductShowParamsDto,
  ): Promise<ProductShowResponseDto> {
    return this.service.show(params.id);
  }

  @Post()
  @Roles("admin", "operador")
  @ApiForbiddenBusinessResponse()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Crear producto" })
  @ApiBody({ type: ProductStoreRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiConflictBusinessResponse("El sku ya esta registrado.")
  @ZodResponse({ status: 201, type: ProductStoreResponseDocDto })
  store(
    @Body(new ZodPipe(productStoreRequestDto)) body: ProductStoreRequestDto,
  ): Promise<ProductStoreResponseDto> {
    return this.service.store(body);
  }

  @Patch(":id")
  @Roles("admin", "operador")
  @ApiForbiddenBusinessResponse()
  @ApiOperation({ summary: "Actualizar producto" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: ProductUpdateRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Producto")
  @ApiConflictBusinessResponse("El sku ya esta registrado.")
  @ZodResponse({ status: 200, type: ProductUpdateResponseDocDto })
  update(
    @Param(new ZodPipe(productUpdateParamsDto)) params: ProductUpdateParamsDto,
    @Body(new ZodPipe(productUpdateRequestDto)) body: ProductUpdateRequestDto,
  ): Promise<ProductUpdateResponseDto> {
    return this.service.update(params.id, body);
  }

  @Delete(":id")
  @Roles("admin", "operador")
  @ApiForbiddenBusinessResponse()
  @ApiOperation({ summary: "Eliminar producto" })
  @ApiParam({ name: "id", type: Number })
  @ApiValidationErrorResponse()
  @ApiResourceNotFoundResponse("Producto")
  @ZodResponse({ status: 200, type: ProductDestroyResponseDocDto })
  destroy(
    @Param(new ZodPipe(productDestroyParamsDto)) params: ProductDestroyParamsDto,
  ): Promise<ProductDestroyResponseDto> {
    return this.service.destroy(params.id);
  }
}
