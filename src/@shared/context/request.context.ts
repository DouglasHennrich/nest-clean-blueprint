import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request context carried through the entire async call chain (services,
 * exceptions, logger) for traceability.
 *
 * Seeded by RequestContextMiddleware on every incoming request, and enriched by
 * @ReqContext() with request-scoped data (ip, userAgent, ...) so the global
 * exception filter can log with the same Correlation ID.
 */
export interface IRequestContextModel {
  requestId: string;
  userId?: string;
  userTimezone?: string;
  ip?: string;
  userAgent?: string;
  startedAt: Date;
  method?: string;
  path?: string;
  query?: Record<string, any>;
  body?: Record<string, any>;
  params?: Record<string, any>;
  [key: string]: any;
}

/**
 * RequestContext
 *
 * Wraps Node.js AsyncLocalStorage to carry per-request data (Correlation ID,
 * userId, timezone, ...) through the entire async call chain WITHOUT having
 * to pass it as a parameter to every service.
 *
 * Seeded by RequestContextMiddleware on every incoming request.
 */
export class RequestContext {
  private static asyncLocalStorage = new AsyncLocalStorage<IRequestContextModel>();

  static run<T>(context: IRequestContextModel, fn: () => T): T {
    return this.asyncLocalStorage.run(context, fn);
  }

  static getContext(): IRequestContextModel | undefined {
    return this.asyncLocalStorage.getStore();
  }

  static getRequestId(): string | undefined {
    return this.getContext()?.requestId;
  }

  static getUserId(): string | undefined {
    return this.getContext()?.userId;
  }

  static getUserTimezone(): string | undefined {
    return this.getContext()?.userTimezone;
  }

  static set(key: string, value: any): void {
    const context = this.getContext();
    if (context) {
      context[key] = value;
    }
  }

  static get(key: string): any {
    return this.getContext()?.[key];
  }
}
