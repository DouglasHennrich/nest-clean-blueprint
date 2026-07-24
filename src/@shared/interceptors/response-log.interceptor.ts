import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * ResponseLogInterceptor
 *
 * Captures a minimal response snapshot (id/ids only) for mutating methods
 * and stores it in `req.__responseBody` as a JSON string.
 *
 * CreateRequestLogEntityMiddleware reads this field on the `res.on('finish')`
 * event and includes it in the payload sent to Redis.
 *
 * Does not capture GET responses to avoid bulk-logging sensitive data.
 */
@Injectable()
export class ResponseLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & Record<string, unknown>>();

    const method = String((req as Record<string, unknown>)['method'] ?? '');
    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((value: unknown) => {
        try {
          const snapshot = this.extractSnapshot(value);
          if (snapshot) {
            (req as any).__responseBody = JSON.stringify(snapshot);
          }
        } catch {
          // Never interrupt the response due to a logging failure
        }
      }),
    );
  }

  private extractSnapshot(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') return null;

    const obj = body as Record<string, unknown>;

    // Pagination: { data: [...] }
    if (Array.isArray(obj['data'])) {
      const ids = (obj['data'] as Record<string, unknown>[])
        .map((item) => item?.['id'])
        .filter(Boolean);
      return ids.length > 0 ? { ids } : null;
    }

    // Array direto
    if (Array.isArray(body)) {
      const ids = (body as Record<string, unknown>[]).map((item) => item?.['id']).filter(Boolean);
      return ids.length > 0 ? { ids } : null;
    }

    // Objeto simples com id
    if (typeof obj['id'] === 'string') {
      return { id: obj['id'] };
    }

    return null;
  }
}
