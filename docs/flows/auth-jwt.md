# Flow 1 — Auth JWT (RS256 + Passport)

Stateless JWT authentication using RS256 asymmetric keys. Every incoming request is validated by a global guard. Routes opt out of authentication by applying `@Public()`.

## Files

| File | Purpose |
|---|---|
| `src/modules/authenticate/authenticate.module.ts` | Registers PassportModule, JwtModule (global, RS256), JwtStrategy, and the global APP_GUARD |
| `src/modules/authenticate/services/jwt-strategy.service.ts` | Passport strategy that validates the Bearer token and sets `req.currentUser` |
| `src/modules/authenticate/guard/jwt-authenticate.guard.ts` | Global guard — checks `@Public()` first, then calls `super.canActivate()` |
| `src/modules/authenticate/models/current-user.struct.ts` | `TCurrentUser` interface (`{ id: string; [key: string]: unknown }`) |
| `src/@shared/modules/cryptography/cryptography.module.ts` | Provides `THasher` (bcrypt) and `TEncrypter` (JWT sign/verify) |
| `src/@shared/modules/cryptography/services/bcrypt-hasher.service.ts` | `BcryptHasher` — `hash()` + `compare()`, saltRounds=10 |
| `src/@shared/modules/cryptography/services/jwt-encrypter.service.ts` | `JwtEncrypter` — `encrypt()` (signAsync) + `decrypt()` (verifyAsync) |
| `src/@decorators/public.decorator.ts` | `@Public()` — marks a route as unauthenticated |
| `src/@decorators/current-user.decorator.ts` | `@CurrentUser()` — extracts `req.currentUser` in controllers |
| `src/@decorators/req-context.decorator.ts` | `@ReqContext()` — extracts `IRequestContext` (logId, userId, ip, userAgent) |

## Environment variables required

```
AUTH_JWT_PRIVATE_KEY=<base64-encoded PEM>   # RS256 private key for signing
AUTH_JWT_PUBLIC_KEY=<base64-encoded PEM>    # RS256 public key for verification
AUTH_JWT_EXPIRES_IN=7d                      # Token TTL (e.g. "1d", "7d", "1h")
```

Generate a key pair:
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
base64 -i private.pem | tr -d '\n'
base64 -i public.pem  | tr -d '\n'
```

## How authentication works

1. `RequestIdMiddleware` seeds `AsyncContext` with a UUID (`req.requestId`)
2. `JwtAuthenticateGuard` (global `APP_GUARD`) runs on every request
3. Guard reads `IS_PUBLIC_KEY` via `Reflector` — if `@Public()` is set, returns `true` immediately
4. For protected routes: `super.canActivate()` triggers `JwtStrategy.validate()`
5. `JwtStrategy` extracts the Bearer token, verifies signature with the RS256 public key, and returns the parsed payload as `TCurrentUser`
6. NestJS attaches the result to `req.currentUser` (via `req.user` + Express type extension)
7. `UnauthorizedException` is thrown on any failure inside the guard's try/catch

## Protecting a route

```typescript
// Protected by default — no decorator needed
@Get('profile')
getProfile(@CurrentUser() user: TCurrentUser) { ... }

// Opt out of authentication
@Public()
@Post('login')
login(@Body(...) dto) { ... }
```

## Issuing a token

Inject `TEncrypter` in any service that needs to sign tokens:

```typescript
constructor(private readonly encrypter: TEncrypter) {}

const token = await this.encrypter.encrypt({ sub: user.id, ...claims });
```

## Hashing passwords

Inject `THasher`:

```typescript
constructor(private readonly hasher: THasher) {}

const hashed = await this.hasher.hash(plainPassword);
const ok     = await this.hasher.compare(plainPassword, hashed);
```

## AppModule wiring

```typescript
imports: [
  AuthenticateModule,   // registers global JwtModule + APP_GUARD
  // AuthorizationModule must come AFTER (reads req.currentUser set by JWT guard)
],
```

## Anti-patterns

```typescript
// ❌ Never put secret/private key in code — use ENV
JwtModule.register({ secret: 'hardcoded-secret' });

// ❌ Never skip the guard — use @Public() instead
@UseGuards()   // empty guards array doesn't remove the global guard

// ❌ currentUser may be undefined on @Public() routes — check before use
const id = user.id;  // crashes if user is undefined on a public route
```
