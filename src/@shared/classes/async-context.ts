import { AsyncLocalStorage } from "node:async_hooks";

export interface IAsyncContext {
  requestId: string;
  userId?: string;
  userTimezone?: string;
  [key: string]: any;
}

/**
 * AsyncContext
 *
 * Wraps Node.js AsyncLocalStorage to carry per-request data (Correlation ID,
 * userId, timezone, ...) through the entire async call chain WITHOUT having
 * to pass it as a parameter to every service.
 *
 * Seeded by RequestIdMiddleware on every incoming request.
 */
export class AsyncContext {
  private static asyncLocalStorage = new AsyncLocalStorage<IAsyncContext>();

  static run<T>(context: IAsyncContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, fn);
  }

  static getContext(): IAsyncContext | undefined {
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
