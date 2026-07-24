import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';
import { TEnvService } from '@/modules/env/services/env.service';
import { BACKOFFICE_METADATA_KEY } from '../decorators/backoffice.decorator';

/** Header expected to carry the shared backoffice access token. */
export const BACKOFFICE_TOKEN_HEADER = 'x-backoffice-token';

/**
 * BackofficeGuard
 *
 * Enforces that requests to routes/controllers decorated with `@BackofficeToken()`
 * present a valid shared secret in the `x-backoffice-token` header, matching
 * `SECRET_BACKOFFICE_ACCESS_TOKEN`.
 *
 * `@BackofficeToken()` alone only sets metadata — it does NOT enforce anything by
 * itself. This guard is what actually reads that metadata and rejects requests
 * that don't carry the correct token. Apply it via `@UseGuards(BackofficeGuard)`
 * on every controller/handler that also uses `@BackofficeToken()`.
 *
 * Routes without the `backoffice` metadata are ignored by this guard (allowed
 * through) so it can be layered on top of the global JWT auth guard without
 * affecting unrelated routes.
 */
@Injectable()
export class BackofficeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly envService: TEnvService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isBackofficeRoute = this.reflector.getAllAndOverride<boolean>(BACKOFFICE_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isBackofficeRoute) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const providedToken = req.headers[BACKOFFICE_TOKEN_HEADER];
    const expectedToken = this.envService.get('SECRET_BACKOFFICE_ACCESS_TOKEN');

    if (typeof providedToken !== 'string' || !providedToken) {
      throw new ForbiddenException('Missing backoffice access token');
    }

    if (!this.tokensMatch(providedToken, expectedToken)) {
      throw new ForbiddenException('Invalid backoffice access token');
    }

    return true;
  }

  /** Constant-time comparison — avoids leaking token length/content via timing. */
  private tokensMatch(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
