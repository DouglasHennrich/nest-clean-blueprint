import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "@/@decorators/public.decorator";

/**
 * JwtAuthenticateGuard
 *
 * Registered as global APP_GUARD in AuthenticateModule.
 * - If route is decorated with @Public() → passes immediately (no token needed)
 * - Otherwise → validates the Bearer JWT using PassportModule JWT strategy
 */
@Injectable()
export class JwtAuthenticateGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
