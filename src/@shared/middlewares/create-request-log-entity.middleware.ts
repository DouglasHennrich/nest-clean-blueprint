import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ILogger } from '../classes/custom-logger';
import { RequestContext } from '../context/request.context';
import { TRequestLogFlushSchedulerService } from '@/modules/queues/services/request-log-flush-scheduler.service';
import { Normalize } from '../utils/normalize';
import { Sanitize } from '../utils/sanitize';

@Injectable()
export class CreateRequestLogEntityMiddleware implements NestMiddleware {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private requestLogFlushSchedulerService: TRequestLogFlushSchedulerService,

    /// //////////////////////////+
    //  Providers
    /// //////////////////////////
    public logger: ILogger,
  ) {
    this.logger.setContextName(CreateRequestLogEntityMiddleware.name);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const { method, path, headers } = req;
    const userAgent = headers['user-agent'] || 'Unknown';
    const startTime = Date.now();

    // Capture request data available at middleware time
    const user = req.currentUser;
    // const account = req.account;

    const earlyRequestData = {
      method,
      path: path || '',
      body: Sanitize.data(req.body),
      params: Sanitize.data(req.params),
      query: Sanitize.data(req.query),
      headers: Sanitize.headers(req.headers),
      ip: Normalize.realIp(req),
      userAgent,
      files: Sanitize.files((req as any).files),
      file: Sanitize.file((req as any).file),
      requestId: RequestContext.getRequestId(),
    };

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const currentUser = req.currentUser;
      // const currentAccount = req.account;

      // For multipart/form-data, body/files/file are populated by multer
      // in the route handler (after the middleware). Re-read them here,
      // only overwriting when the initial value was empty.
      const body = earlyRequestData.body ?? Sanitize.data(req.body);
      const files = earlyRequestData.files ?? Sanitize.files((req as any).files);
      const file = earlyRequestData.file ?? Sanitize.file((req as any).file);

      const payload = {
        method: earlyRequestData.method,
        path: earlyRequestData.path,
        body,
        params: earlyRequestData.params,
        query: earlyRequestData.query,
        headers: earlyRequestData.headers,
        ip: earlyRequestData.ip,
        userAgent: earlyRequestData.userAgent,
        files,
        file,
        userId: currentUser?.id ?? user?.id,
        userEmail: (currentUser?.email as string) ?? undefined, // ?? currentAccount?.email ?? account?.email,
        userName: (currentUser?.name as string) ?? (user?.name as string) ?? undefined,
        userType: (currentUser?.userType as string) ?? ((user as any)?.userType as string),
        statusCode: res.statusCode,
        responseTime,
        errorMessage: (req as any).__errorMessage as string | undefined,
        stackTrace: (req as any).__stackTrace as string | undefined,
        requestId: RequestContext.getRequestId() ?? earlyRequestData.requestId,
        responseBody: (req as any).__responseBody as string | undefined,
        entityIds: this.extractEntityIds(earlyRequestData.path),
      };

      this.requestLogFlushSchedulerService.enqueue(payload).catch((err) => {
        this.logger.error(`Failed to enqueue request log: ${(err as Error).message}`);
      });
    });

    next();
  }

  private extractEntityIds(path: string): string | undefined {
    const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const matches = path.match(UUID_REGEX);
    if (!matches || matches.length === 0) return undefined;
    return JSON.stringify(matches);
  }
}
