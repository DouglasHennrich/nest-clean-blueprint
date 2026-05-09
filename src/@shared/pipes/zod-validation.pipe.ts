import { PipeTransform } from "@nestjs/common";
import { ZodError, ZodSchema } from "zod";

/**
 * ZodValidationPipe
 *
 * Inline validation pipe used on @Body(), @Query() and @Param() decorators.
 * It MUST be applied to every endpoint input — see api-design conventions.
 *
 * @example
 *   @Body(new ZodValidationPipe(createOrderDtoBodySchema))
 *   dto: TCreateOrderDtoBodySchema,
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform<T>(value: unknown): T {
    try {
      return this.schema.parse(value) as T;
    } catch (error) {
      if (error instanceof ZodError) {
        throw error;
      }
      throw new ZodError([
        { code: "custom", path: [], message: "Validation failed" },
      ]);
    }
  }
}
