import { HttpStatus } from "@nestjs/common";
import { IRequestContext } from "../protocols/request-context.struct";

/**
 * Base class for all domain/application exceptions.
 *
 * Carries an HTTP status code and optional request context (Correlation ID,
 * userId, etc.) so the global exception filter can render proper responses
 * and logs.
 *
 * Always extend this class for new exceptions — never throw raw Errors from
 * services. (And remember: services do NOT throw — they return Result.fail.)
 */
export abstract class AbstractApplicationException extends Error {
  public statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  public context?: IRequestContext;

  constructor(
    message: string,
    name: string,
    statusCode?: number,
    context?: IRequestContext,
  ) {
    super(message);
    this.name = name || "AbstractApplicationException";
    this.statusCode = statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    this.context = context;
  }
}

/**
 * Generic fallback exception for cases without a domain-specific class.
 */
export class DefaultException extends AbstractApplicationException {
  constructor(
    message: string,
    name: string = "DefaultException",
    statusCode: number = HttpStatus.BAD_REQUEST,
    context?: IRequestContext,
  ) {
    super(message, name, statusCode, context);
  }
}
