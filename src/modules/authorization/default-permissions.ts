/**
 * DEFAULT_PERMISSIONS
 *
 * Seed permissions assigned at account creation by role.
 * These are stored as string[] on the user record and evaluated
 * by CaslAbilityFactory.defineAbility() on every request.
 */
export enum UserRoleEnum {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  OPERATOR = "OPERATOR",
  VIEWER = "VIEWER",
  GUEST = "GUEST",
}

export const DEFAULT_PERMISSIONS: Record<UserRoleEnum, string[]> = {
  [UserRoleEnum.ADMIN]: ["manage:all"],
  [UserRoleEnum.MANAGER]: [
    "manage:orders",
    "manage:items",
    "manage:catalogs",
    "manage:widgets",
  ],
  [UserRoleEnum.OPERATOR]: ["read:orders", "write:items", "read:catalogs"],
  [UserRoleEnum.VIEWER]: ["read:orders", "read:items", "read:catalogs"],
  [UserRoleEnum.GUEST]: [],
};
