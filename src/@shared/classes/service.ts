import { ZodSchema } from 'zod';
import { Result } from './result';
import { ILogger } from './custom-logger';
import { DefaultException } from '../errors/abstract-application-exception';

/**
 * AbstractService<Dto, Response>
 *
 * Base contract for every business service. Each service exposes ONE method:
 *   execute(payload) => Promise<Result<Response>>
 *
 * Services MUST NOT throw — wrap errors in Result.fail. Only controllers throw.
 * Request-scoped data (Correlation ID, userId, ...) is NOT passed as a
 * parameter — read it internally via `RequestContext.getContext()` when needed.
 *
 * Convention: define an abstract token T<Action><Entity>Service that extends
 * AbstractService<...>, then provide it via { provide, useClass } in the module.
 */
export abstract class AbstractService<Dto, Response> {
  logger?: ILogger;

  abstract execute(payload: Dto): Promise<Result<Response>>;

  /**
   * Optional convention: services that accept a raw Dto can re-validate it
   * with a Zod schema at the top of execute() and return Result.fail(...)
   * on failure instead of throwing. Not all services need this — only use
   * it when the payload isn't already validated upstream (e.g. controller
   * DTO pipes already cover the common case).
   *
   * Declared `static` (rather than an instance method) so it doesn't become
   * a required member on every class that does `implements TXService` — the
   * convention used across this codebase's services, which only declare
   * `execute()`.
   *
   * @example
   *   const invalid = AbstractService.validateDto(createOrderSchema, payload);
   *   if (invalid) return invalid;
   */
  static validateDto<T>(schema: ZodSchema<T>, payload: unknown): Result<T> | undefined {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return Result.fail(new DefaultException('Validation failed', 'ValidationError', 400));
    }
    return undefined; // caller continues with the already-known-valid payload
  }
}
