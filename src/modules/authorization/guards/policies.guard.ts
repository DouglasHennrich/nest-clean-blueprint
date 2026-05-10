import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "@/@decorators/public.decorator";
import { CaslAbilityFactory } from "../casl-ability.factory";
import { CHECK_POLICIES_KEY } from "../decorators/check-policies.decorator";
import { TPolicyHandler } from "../models/policy.struct";

/**
 * PoliciesGuard
 *
 * Registered as global APP_GUARD in AuthorizationModule.
 * Runs AFTER JwtAuthenticateGuard (order depends on registration order).
 *
 * - @Public() routes → skipped (no auth guard ran, no currentUser)
 * - Routes without @CheckPolicies → allowed (no policy declared = open to auth'd users)
 * - Routes with @CheckPolicies → all handlers must return true
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip public routes — JWT guard didn't run, no currentUser set
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const handlers = this.reflector.getAllAndOverride<TPolicyHandler[]>(
      CHECK_POLICIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @CheckPolicies declared → allow all authenticated users
    if (!handlers || handlers.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).currentUser;

    if (!user) throw new ForbiddenException("No authenticated user");

    const ability = this.caslAbilityFactory.defineAbility(user);

    const allowed = handlers.every((handler) =>
      typeof handler === "function"
        ? handler(ability)
        : handler.handle(ability),
    );

    if (!allowed) throw new ForbiddenException("Insufficient permissions");
    return true;
  }
}
