# Flow 6 — Rate Limit (Public routes)

Redis-backed rate limiting applied exclusively to `@Public()` routes. Authenticated routes are not rate-limited by this guard (they rely on authentication as the barrier). The guard is registered as a global `APP_GUARD` and runs after the JWT guard.

## Files

| File | Purpose |
|---|---|
| `src/@shared/guards/public-rate-limit.guard.ts` | `PublicRateLimitGuard` — reads `IS_PUBLIC_KEY`, checks Redis counter, throws HTTP 429 |

## AppModule wiring

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: PublicRateLimitGuard,
  },
],
```

Guard execution order (all global APP_GUARDs in registration order):
1. `JwtAuthenticateGuard` — validates Bearer token
2. `PublicRateLimitGuard` — rate-limits public routes
3. `PoliciesGuard` — CASL authorization

## How it works

```
Request hits @Public() route
  ↓
PublicRateLimitGuard reads IS_PUBLIC_KEY from Reflector
  ↓
Not @Public() → skip (return true)
  ↓
Build key: ratelimit:{ip}:{path}
  ↓
Read counter from Redis (getSimple)
  ↓
Counter ≥ 60? → HTTP 429 + Retry-After header
  ↓
Counter < 60 → increment (setSimple, TTL=60s) → allow
```

## Default limits

```
Window : 60 seconds
Max    : 60 requests per IP per path
Key    : ratelimit:{clientIp}:{urlPath}
```

## Rate limit response body (HTTP 429)

```json
{
  "logId": "...",
  "statusCode": 429,
  "message": "Too many requests. Retry after 60 seconds.",
  "name": "TooManyRequestsException",
  "timestamp": "...",
  "path": "/api/v1/login",
  "errors": null
}
```

## Trust proxy requirement

`app.set('trust proxy', 'loopback')` must be set in `main.ts` so that `req.ip` resolves to the real client IP behind a load balancer or reverse proxy, not `127.0.0.1`.

```typescript
// src/main.ts
const app = await NestFactory.create<NestExpressApplication>(AppModule, ...);
app.set('trust proxy', 'loopback');
```

## Customizing limits

Edit `src/@shared/guards/public-rate-limit.guard.ts`:

```typescript
const WINDOW_SECONDS = 60;
const MAX_REQUESTS   = 60;
```

## Bypassing rate limit for specific public routes

The guard checks `IS_PUBLIC_KEY` — a route without `@Public()` is never rate-limited. If you need a public route exempt from rate limiting, consider using a different decorator or extending the guard's `shouldSkip()` logic.

## Anti-patterns

```typescript
// ❌ Don't apply rate limiting to authenticated routes in this guard —
// it creates a confusing model where unauthenticated requests are limited
// but token-crafting attacks are not. Use a dedicated throttler module for that.

// ❌ Don't use in-memory counters in a multi-instance deployment
// Every pod would have its own counter — rate limit would be MAX × pods
const counters = new Map<string, number>(); // wrong in production

// ❌ Don't forget trust proxy — req.ip will always be 127.0.0.1 behind nginx
// and all requests will share the same rate limit bucket
```
