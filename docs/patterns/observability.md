# Observability (optional Sentry)

`src/@shared/observability/sentry.ts` wraps `@sentry/node` behind two functions. It is
**opt-in and no-op by default** — safe to import even when Sentry isn't configured.

```typescript
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;           // no-op unless SENTRY_DSN is set

  Sentry.init({ dsn, tracesSampleRate: 1.0 });
  initialized = true;
}

export function captureException(error: unknown): void {
  if (!initialized) return;   // no-op until initSentry() actually initialized
  Sentry.captureException(error);
}
```

## Wiring

- `initSentry()` is called once from `src/main.ts` during bootstrap.
- `captureException(error)` is called from `src/@shared/filters/exceptions.filter.ts` so
  every unhandled/thrown exception is reported when Sentry is active.

## Configuration (env)

| Var | Notes |
|---|---|
| `SENTRY_DSN` | Optional. When unset, `initSentry()` and `captureException()` are both no-ops — no Sentry SDK network calls happen and nothing needs to be mocked in tests. |

## Rules

- Never assume Sentry is configured — always guard on the module's own `initialized` flag (already handled internally; don't duplicate the check at call sites).
- Don't call `Sentry.*` directly from application code — go through `initSentry()` / `captureException()` so the no-op behavior stays centralized in one file.
