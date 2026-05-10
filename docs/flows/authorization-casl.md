# Flow 2 — Authorization (CASL)

Fine-grained, permission-string-based authorization. Users carry a `permissions: string[]` array on their token. `CaslAbilityFactory` converts that array into a CASL `MongoAbility`. A global `PoliciesGuard` enforces `@CheckPolicies()` declarations on each route.

## Files

| File | Purpose |
|---|---|
| `src/modules/authorization/authorization.module.ts` | Registers `CaslAbilityFactory` and `PoliciesGuard` as global `APP_GUARD` |
| `src/modules/authorization/casl-ability.factory.ts` | Builds `TAppAbility` from `user.permissions[]` |
| `src/modules/authorization/guards/policies.guard.ts` | Global guard — skips `@Public()`, enforces `@CheckPolicies()` handlers |
| `src/modules/authorization/decorators/check-policies.decorator.ts` | `@CheckPolicies(...handlers)` — declares required policies on a route |
| `src/modules/authorization/models/policy.struct.ts` | `IPolicyHandler` interface + `TPolicyHandler` union |
| `src/modules/authorization/default-permissions.ts` | `UserRoleEnum` + `DEFAULT_PERMISSIONS` seed map by role |

## Permission string format

```
"action:resource"          →  can('write', 'orders')
"action:resource:feature"  →  can('write', 'orders', { feature: 'draft' })
"manage:all"               →  superuser (can do anything)
```

### Available actions
`manage` | `read` | `write` | `delete`

### Available resources
`all` | `orders` | `items` | `catalogs` | `widgets` | `accounts`

### Implied permissions
`write` on any resource automatically grants `read` on the same resource (and same feature scope if 3-part).

## Default role permissions

```typescript
ADMIN    → ['manage:all']
MANAGER  → ['manage:orders', 'manage:items', 'manage:catalogs', 'manage:widgets']
OPERATOR → ['read:orders', 'write:items', 'read:catalogs']
VIEWER   → ['read:orders', 'read:items', 'read:catalogs']
GUEST    → []
```

## AppModule wiring

```typescript
imports: [
  AuthenticateModule,     // MUST come first — sets req.currentUser
  AuthorizationModule,    // MUST come after — reads req.currentUser
],
```

`PoliciesGuard` runs after `JwtAuthenticateGuard`. Order matters.

## Applying policies to routes

### Function handler (inline — most common)

```typescript
import { CheckPolicies } from '@/modules/authorization/decorators/check-policies.decorator';

@CheckPolicies((ability) => ability.can('read', 'orders'))
@Get()
findAll() { ... }
```

### Class handler (reusable across controllers)

```typescript
class ReadOrdersPolicy implements IPolicyHandler {
  handle(ability: TAppAbility): boolean {
    return ability.can('read', 'orders');
  }
}

@CheckPolicies(new ReadOrdersPolicy())
@Get()
findAll() { ... }
```

### Multiple handlers (AND logic — all must pass)

```typescript
@CheckPolicies(
  (ability) => ability.can('read', 'orders'),
  (ability) => ability.can('read', 'catalogs'),
)
@Get()
findAll() { ... }
```

### Feature-scoped check

```typescript
@CheckPolicies((ability) => ability.can('write', 'orders', { feature: 'draft' }))
@Post('draft')
createDraft() { ... }
```

## Guard behavior

| Scenario | Result |
|---|---|
| Route has `@Public()` | Skip guard → allowed |
| Route has no `@CheckPolicies()` | Allow all authenticated users |
| Route has `@CheckPolicies()` + no `req.currentUser` | `ForbiddenException` |
| All handlers return `true` | Allowed |
| Any handler returns `false` | `ForbiddenException("Insufficient permissions")` |

## Extending resources and actions

Edit `src/modules/authorization/casl-ability.factory.ts`:

```typescript
export const PERMISSIONS_RESOURCES = [
  'all', 'orders', 'items', 'catalogs', 'widgets', 'accounts',
  'invoices',   // ← add here
] as const;
```

## Anti-patterns

```typescript
// ❌ AuthorizationModule before AuthenticateModule — req.currentUser is undefined
imports: [AuthorizationModule, AuthenticateModule]

// ❌ @Global() on AuthorizationModule — APP_GUARD already makes it global
@Global() @Module({ providers: [{ provide: APP_GUARD, useClass: PoliciesGuard }] })

// ❌ Checking ability inside a service — authorization belongs at the HTTP layer
async execute() { if (!ability.can(...)) throw new ForbiddenException(); }
```
