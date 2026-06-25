/**
 * Per-request context carried through services and exceptions for traceability.
 *
 * Populated by middlewares and decorators (e.g. @ReqContext()), and propagated
 * to errors so the global exception filter can log with the same Correlation ID.
 */
export interface IRequestContext {
  requestId: string;
  ip?: string;
  userAgent?: string;
  timestamp?: Date;
  query?: Record<string, any>;
  body?: Record<string, any>;
  params?: Record<string, any>;
  [key: string]: any;
}
