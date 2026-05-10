import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { TCurrentUser } from "@/modules/authenticate/models/current-user.struct";

export const CurrentUser = createParamDecorator(
  (_: never, context: ExecutionContext): TCurrentUser | undefined => {
    const req = context.switchToHttp().getRequest<Request>();
    return (req as any).currentUser;
  },
);
