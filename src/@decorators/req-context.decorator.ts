import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";

export const ReqContext = createParamDecorator(
  (_: never, context: ExecutionContext): IRequestContext => {
    const req = context.switchToHttp().getRequest<Request>();
    const currentUser = (req as any).currentUser;
    return {
      requestId: (req as any).requestId ?? "no-request-id",
      userId: currentUser?.id,
      userTimezone: (req as any).userTimezone,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };
  },
);
