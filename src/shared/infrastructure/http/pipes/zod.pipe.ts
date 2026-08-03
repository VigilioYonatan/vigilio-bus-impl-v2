import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

@Injectable()
export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Validation failed",
        errors: result.error.issues.map((error) => ({
          field: String(error.path.join(".")),
          message: error.message,
        })),
      });
    }

    return result.data;
  }
}
