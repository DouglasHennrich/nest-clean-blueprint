import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ZodError } from "zod";
import { isAxiosError } from "axios";
import { AbstractApplicationException } from "@/@shared/errors/abstract-application-exception";
import { ILogger } from "@/@shared/classes/custom-logger";
import { AsyncContext } from "@/@shared/classes/async-context";

/**
 * HTTP status codes treated as server-side failures — logged at error level.
 * 4xx errors are client mistakes (warn); these 5xx codes are genuine server problems.
 */
const SERVER_ERROR_STATUSES = [
  HttpStatus.INTERNAL_SERVER_ERROR, // 500
  HttpStatus.NOT_IMPLEMENTED, // 501
  HttpStatus.BAD_GATEWAY, // 502
  HttpStatus.SERVICE_UNAVAILABLE, // 503
  HttpStatus.GATEWAY_TIMEOUT, // 504
];

/**
 * Exception names whose warn-level log is intentionally suppressed.
 * Use for known "expected" business errors that would generate log noise.
 * Add domain-specific entries as the project grows.
 *
 * @example ["PaymentRequiredException", "SubscriptionSuspendedException"]
 */
const SKIP_WARN_LOG_EXCEPTIONS: string[] = [];

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: ILogger) {
    this.logger.setContextName(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // Drop errors that should never produce an HTTP response
    if (this.shouldIgnore(exception, req)) {
      return;
    }

    const logId = AsyncContext.getRequestId() ?? req.requestId ?? "no-id";
    const exc = exception as any;

    // Seed defaults from the raw exception before type-specific overrides
    let statusCode: number = exc?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = exc?.message ?? "Internal server error";
    let errorName: string = exc?.name ?? "InternalServerError";
    let validationErrors: Array<{
      field: string;
      message: string;
      code: string;
    }> | null = null;

    if (exception instanceof AbstractApplicationException) {
      statusCode = exception.statusCode;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof ZodError) {
      statusCode = HttpStatus.BAD_REQUEST;
      errorName = "ValidationError";
      message = "Validation failed";
      validationErrors = exception.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
        code: e.code,
      }));
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorName = exception.name;

      // NestJS HttpExceptions can carry a { message, statusCode } response
      // (e.g., built-in ValidationPipe with class-validator messages)
      const httpRes = exception.getResponse();
      if (typeof httpRes === "object" && httpRes !== null) {
        const resObj = httpRes as Record<string, unknown>;
        if (resObj.message) {
          message = Array.isArray(resObj.message)
            ? (resObj.message as string[]).join(", ")
            : String(resObj.message);
        }
      } else if (typeof httpRes === "string") {
        message = httpRes;
      }
    }

    const logData = {
      logId,
      statusCode,
      errorName,
      path: req.url,
      method: req.method,
      user: req.currentUser,
      stack: exc?.stack,
    };

    // Logging strategy:
    // - 5xx → error level (always, except ValidationError which is a client mistake)
    // - 4xx → warn level (unless suppressed via SKIP_WARN_LOG_EXCEPTIONS)
    // - ValidationError gets its own warn below, with the errors[] array included
    if (exc?.stack && errorName !== "ValidationError") {
      if (SERVER_ERROR_STATUSES.includes(statusCode)) {
        this.logger.error(message, logData);
      } else if (!SKIP_WARN_LOG_EXCEPTIONS.includes(errorName)) {
        this.logger.warn(message, logData);
      }
    }

    const errorResponse = {
      logId,
      statusCode,
      message,
      name: errorName,
      timestamp: new Date().toISOString(),
      path: req.url,
      errors: validationErrors,
    };

    // Log validation errors with the full errors[] array for debugging
    if (validationErrors) {
      this.logger.warn(message, { ...logData, errors: validationErrors });
    }

    // Store on request so downstream middleware can enrich request logs
    req.__errorMessage = message;
    if (exc?.stack) req.__stackTrace = exc.stack;

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Returns true for exceptions that should be silently dropped
   * (i.e., no HTTP response is sent).
   *
   * - /favicon.ico → browsers auto-request this; routing miss causes a 404 flood
   * - AxiosError   → surfaced normally by default. Uncomment the block to suppress
   *                  errors from a specific outbound integration (e.g., a webhook).
   */
  private shouldIgnore(exception: unknown, req: Request): boolean {
    if (req.path === "/favicon.ico") return true;

    // Customize to suppress specific outbound integration errors:
    // if (isAxiosError(exception)) {
    //   const fullUrl = (exception.config?.baseURL ?? "") + (exception.config?.url ?? "");
    //   if (fullUrl.toLowerCase().includes("discord")) return true;
    // }
    void isAxiosError; // imported — available for the block above

    return false;
  }
}
