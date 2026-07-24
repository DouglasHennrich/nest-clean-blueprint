jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

describe('sentry', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('initSentry', () => {
    it('should be a no-op when SENTRY_DSN is unset', async () => {
      delete process.env.SENTRY_DSN;
      const Sentry = await import('@sentry/node');
      const { initSentry } = await import('./sentry');

      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should call Sentry.init when SENTRY_DSN is set', async () => {
      process.env.SENTRY_DSN = 'https://public@sentry.example.com/1';
      const Sentry = await import('@sentry/node');
      const { initSentry } = await import('./sentry');

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: 'https://public@sentry.example.com/1',
        tracesSampleRate: 1.0,
      });
    });
  });

  describe('captureException', () => {
    it('should no-op when Sentry was never initialized (DSN unset)', async () => {
      delete process.env.SENTRY_DSN;
      const Sentry = await import('@sentry/node');
      const { captureException } = await import('./sentry');

      captureException(new Error('boom'));

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should call through to Sentry.captureException once initialized', async () => {
      process.env.SENTRY_DSN = 'https://public@sentry.example.com/1';
      const Sentry = await import('@sentry/node');
      const { initSentry, captureException } = await import('./sentry');
      initSentry();

      const error = new Error('boom');
      captureException(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });
});
