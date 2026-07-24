import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
  });

  initialized = true;
}

export function captureException(error: unknown): void {
  if (!initialized) {
    return;
  }

  Sentry.captureException(error);
}
