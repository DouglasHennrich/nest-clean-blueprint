import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { TDataCacheService } from "@/@shared/modules/cache/services/data-cache.service";
import { IS_PUBLIC_KEY } from "@/@decorators/public.decorator";

/** Rate limit configuration for public endpoints */
const RATE_LIMIT = {
  /** Maximum requests per window */
  maxRequests: 60,
  /** Window duration in seconds */
  windowSeconds: 60,
};

/**
 * PublicRateLimitGuard
 *
 * Applies sliding-window rate limiting ONLY to @Public() routes.
 * Uses Redis via TDataCacheService for distributed counter storage.
 *
 * Protected (JWT) routes are NOT rate-limited by this guard —
 * they are controlled by authentication and should be rate-limited
 * at the infrastructure level (API gateway / nginx) if needed.
 *
 * Registration: add to providers in AppModule as APP_GUARD
 * (runs AFTER JwtAuthenticateGuard since APP_GUARDs are ordered by registration)
 */
@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: TDataCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Only rate-limit public routes
    if (!isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const path = req.path;
    const key = `ratelimit:${ip}:${path}`;

    const current = (await this.cacheService.getSimple<number>(key)) ?? 0;

    if (current >= RATE_LIMIT.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many requests — please try again later.",
          name: "TooManyRequestsException",
          retryAfter: RATE_LIMIT.windowSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment and refresh TTL
    await this.cacheService.setSimple<number>(
      key,
      current + 1,
      RATE_LIMIT.windowSeconds,
    );

    return true;
  }
}
