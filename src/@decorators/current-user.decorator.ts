import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Request } from "express";

export interface ICurrentUser {
  id: string;
  email?: string;
  [key: string]: any;
}

/**
 * @User()
 *
 * Returns the authenticated user attached by the auth guard to req.user.
 * Replace ICurrentUser with your project's user payload type.
 */
export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ICurrentUser => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user: ICurrentUser }>();
    return req.user;
  },
);
