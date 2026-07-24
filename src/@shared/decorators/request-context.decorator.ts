import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { RequestContext, IRequestContextModel } from '@/@shared/context/request.context';

/**
 * @ReqContext()
 *
 * Builds an IRequestContextModel from the current RequestContext + Express request.
 * Inject into controller handlers and forward to services so errors can be
 * augmented with the originating Correlation ID, IP, user agent, etc.
 *
 * @example
 *   async createOrder(@ReqContext() context: IRequestContextModel, ...) {
 *     const result = await this.service.execute(dto, context);
 *     if (result.error) throw result.error;
 *   }
 */
export const ReqContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IRequestContextModel => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const asyncCtx = RequestContext.getContext();

    return {
      requestId: asyncCtx?.requestId ?? 'no-request-id',
      userId: asyncCtx?.userId,
      userTimezone: asyncCtx?.userTimezone,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      startedAt: asyncCtx?.startedAt ?? new Date(),
    };
  },
);
