import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext, IRequestContextModel } from '../context/request.context';
import { Normalize } from '../utils/normalize';

/**
 * RequestContextMiddleware
 *
 * MUST be the FIRST middleware in the chain. Generates a UUID Correlation ID
 * (or reuses x-request-id header if present), exposes it as X-Request-ID on
 * the response, and seeds RequestContext with every field of IRequestContextModel
 * available at the HTTP layer, so every downstream log/service/exception can
 * read it via RequestContext.getContext() without threading it through params.
 *
 * userId is NOT set here — it only exists after the authentication guard runs
 * (guards execute after middlewares in the Nest lifecycle).
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    const userTimezone = req.headers['x-user-timezone'] as string | undefined;

    res.setHeader('X-Request-ID', requestId);

    const context: IRequestContextModel = {
      requestId,
      userTimezone,
      ip: Normalize.realIp(req),
      userAgent: req.headers['user-agent'],
      startedAt: new Date(),
      method: req.method,
      path: req.path,
      query: req.query as Record<string, any>,
      body: req.body as Record<string, any>,
      params: req.params,
    };

    RequestContext.run(context, () => {
      next();
    });
  }
}
