import { ConsoleLogger, Injectable, Scope } from "@nestjs/common";
import { AsyncContext } from "./async-context";

/**
 * ILogger — DI token for the application logger.
 *
 * All services declare `public logger: ILogger` and call setContextName()
 * in their constructor so log lines are tagged with the originating class.
 */
export abstract class ILogger {
  abstract setContextName(contextName: string): void;
  abstract log(message: any, context?: any): void;
  abstract error(message: any, context?: any): void;
  abstract warn(message: any, context?: any): void;
  abstract debug(message: any, context?: any): void;
  abstract verbose(message: any, context?: any): void;
}

/**
 * CustomLogger — minimal ILogger implementation for the bootstrap.
 *
 * - Wraps NestJS ConsoleLogger.
 * - Reads Correlation ID (requestId) from AsyncContext on every log line so
 *   every log can be traced back to the originating request.
 *
 * Extend this class to plug in Winston, S3 archival, Sentry, Discord webhooks,
 * etc. The interface (ILogger) stays the same — your services don't change.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger extends ConsoleLogger implements ILogger {
  private contextName?: string;

  constructor(contextName?: string) {
    super(contextName ?? "Application");
    if (contextName) {
      this.contextName = contextName;
    }
  }

  setContextName(contextName: string): void {
    this.contextName = contextName;
    this.setContext(contextName);
  }

  protected formatMessage(message: any): string {
    const requestId = AsyncContext.getRequestId() ?? "no-request-id";
    const ctx = this.contextName ?? "Application";
    const text =
      typeof message === "string" ? message : JSON.stringify(message);
    return `[${ctx}][${requestId}] ${text}`;
  }

  log(message: any): void {
    super.log(this.formatMessage(message));
  }

  error(message: any, trace?: string): void {
    super.error(this.formatMessage(message), trace);
  }

  warn(message: any): void {
    super.warn(this.formatMessage(message));
  }

  debug(message: any): void {
    super.debug(this.formatMessage(message));
  }

  verbose(message: any): void {
    super.verbose(this.formatMessage(message));
  }
}
