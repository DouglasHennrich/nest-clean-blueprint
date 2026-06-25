import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * ResponseLogInterceptor
 *
 * Captura um snapshot mínimo da resposta (somente id/ids) para mutating methods
 * e armazena em `req.__responseBody` como JSON string.
 *
 * O CreateRequestLogEntityMiddleware lê esse campo no evento `res.on('finish')`
 * e inclui no payload enviado ao Redis.
 *
 * Não captura respostas de GET para evitar logar dados sensíveis em massa.
 */
@Injectable()
export class ResponseLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & Record<string, unknown>>();

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
          // Nunca interromper a resposta por falha no log
        }
      }),
    );
  }

  private extractSnapshot(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') return null;

    const obj = body as Record<string, unknown>;

    // Paginação: { data: [...] }
    if (Array.isArray(obj['data'])) {
      const ids = (obj['data'] as Record<string, unknown>[])
        .map((item) => item?.['id'])
        .filter(Boolean);
      return ids.length > 0 ? { ids } : null;
    }

    // Array direto
    if (Array.isArray(body)) {
      const ids = (body as Record<string, unknown>[])
        .map((item) => item?.['id'])
        .filter(Boolean);
      return ids.length > 0 ? { ids } : null;
    }

    // Objeto simples com id
    if (typeof obj['id'] === 'string') {
      return { id: obj['id'] };
    }

    return null;
  }
}
