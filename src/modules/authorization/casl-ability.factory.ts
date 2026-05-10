import { Injectable } from "@nestjs/common";
import {
  AbilityBuilder,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { TCurrentUser } from "@/modules/authenticate/models/current-user.struct";

export const PERMISSIONS_ACTIONS = [
  "manage",
  "read",
  "write",
  "delete",
] as const;
export const PERMISSIONS_RESOURCES = [
  "all",
  "orders",
  "items",
  "catalogs",
  "widgets",
  "accounts",
] as const;

export type TPermissionsActions = (typeof PERMISSIONS_ACTIONS)[number];
export type TPermissionsSubjects = (typeof PERMISSIONS_RESOURCES)[number];

export type TAppAbility = MongoAbility<
  [TPermissionsActions, TPermissionsSubjects]
>;

/**
 * CaslAbilityFactory
 *
 * Builds a CASL MongoAbility from a user's string-array permissions.
 * Permission format: "action:resource" or "action:resource:feature"
 *
 * Rules:
 * - "manage:all" → superuser (can do anything)
 * - "write:orders" → implies "read:orders" automatically
 * - "write:items:draft" → scoped to { feature: 'draft' }
 */
@Injectable()
export class CaslAbilityFactory {
  defineAbility(user: TCurrentUser & { permissions?: string[] }): TAppAbility {
    const { can, build } = new AbilityBuilder<TAppAbility>(createMongoAbility);
    const permissions = user.permissions ?? [];

    if (permissions.includes("manage:all") || permissions.includes("all")) {
      can("manage", "all");
    } else {
      permissions.forEach((perm) => {
        const parts = perm.split(":");

        if (parts.length < 2) return;

        const action = parts[0] as TPermissionsActions;
        const resource = parts[1] as TPermissionsSubjects;
        const feature = parts[2];

        if (feature) {
          can(action, resource, { feature } as any);
          if (action === "write") can("read", resource, { feature } as any);
        } else {
          can(action, resource);
          if (action === "write") can("read", resource);
        }
      });
    }

    return build({
      detectSubjectType: (item: any) =>
        typeof item === "string" ? item : item.__caslSubjectType__,
    });
  }
}
