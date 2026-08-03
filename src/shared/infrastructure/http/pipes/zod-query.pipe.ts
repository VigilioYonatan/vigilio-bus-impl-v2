import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import type { ZodTypeAny, z } from "zod";

@Injectable()
export class ZodQueryPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: Record<string, string>): z.output<T> {
    const normalized: Record<string, unknown> = { ...value };

    for (const key of ["limit", "offset"]) {
      if (typeof normalized[key] === "string") {
        normalized[key] = Number(normalized[key]);
      }
    }

    const result = this.schema.safeParse(normalized);

    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Query validation failed",
        errors: result.error.issues.map((error) => ({
          field: String(error.path.join(".")),
          message: error.message,
        })),
      });
    }

    return result.data;
  }
}
