import { TAppAbility } from "../casl-ability.factory";

/**
 * IPolicyHandler — class-based policy handler.
 * Implement this interface and pass an instance to @CheckPolicies.
 */
export interface IPolicyHandler {
  handle(ability: TAppAbility): boolean;
}

/**
 * TPolicyHandler — either a class-based or function-based policy handler.
 *
 * @example Function-based (inline, most common):
 *   @CheckPolicies((ability) => ability.can('read', 'orders'))
 *
 * @example Class-based (reusable across routes):
 *   class ReadOrdersPolicy implements IPolicyHandler {
 *     handle(ability: TAppAbility) { return ability.can('read', 'orders'); }
 *   }
 *   @CheckPolicies(new ReadOrdersPolicy())
 */
export type TPolicyHandler =
  | IPolicyHandler
  | ((ability: TAppAbility) => boolean);
