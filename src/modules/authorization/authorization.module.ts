import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { PoliciesGuard } from "./guards/policies.guard";

/**
 * AuthorizationModule
 *
 * Registers PoliciesGuard as a global APP_GUARD.
 * IMPORTANT: Must be imported AFTER AuthenticateModule in AppModule
 * so JWT guard runs first and sets req.currentUser.
 *
 * Usage in controllers:
 *   @CheckPolicies((ability) => ability.can('read', 'orders'))
 */
@Module({
  providers: [
    CaslAbilityFactory,
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
  ],
  exports: [CaslAbilityFactory],
})
export class AuthorizationModule {}
