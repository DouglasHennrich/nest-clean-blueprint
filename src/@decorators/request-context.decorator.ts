import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Request } from "express";
import { AsyncContext } from "@/@shared/classes/async-context";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";

/**
 * @ReqContext()
 *
 * Builds an IRequestContext from the current AsyncContext + Express request.
 * Inject into controller handlers and forward to services so errors can be
 * augmented with the originating Correlation ID, IP, user agent, etc.
 *
 * @example
 *   async createOrder(@ReqContext() context: IRequestContext, ...) {
 *     const result = await this.service.execute(dto, context);
 *     if (result.error) throw result.error;
 *   }
 */
export const ReqContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IRequestContext => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const asyncCtx = AsyncContext.getContext();

    return {
      requestId: asyncCtx?.requestId ?? "no-request-id",
      userId: asyncCtx?.userId,
      userTimezone: asyncCtx?.userTimezone,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };
  },
);
