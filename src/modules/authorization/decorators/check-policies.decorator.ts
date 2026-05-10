import { SetMetadata } from "@nestjs/common";
import { TPolicyHandler } from "../models/policy.struct";

export const CHECK_POLICIES_KEY = "check_policy";

/**
 * @CheckPolicies decorator
 *
 * Declares which CASL policies must pass for a route to be accessible.
 * All handlers must return true (AND logic).
 *
 * @example
 *   @CheckPolicies((ability) => ability.can('read', 'orders'))
 *   @Get()
 *   findAll() { ... }
 */
export const CheckPolicies = (...handlers: TPolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
