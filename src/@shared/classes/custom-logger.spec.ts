import { ConsoleLogger } from '@nestjs/common';
import * as winston from 'winston';
import { CustomLogger } from './custom-logger';
import { RequestContext, IRequestContextModel } from '../context/request.context';
import { BackofficeConfigsSingleton } from '@/modules/backoffice/singletons/backoffice-configs.singleton';

jest.mock('winston-daily-rotate-file', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  };
});

jest.mock('winston', () => ({
  format: {
    printf: jest.fn((fn: unknown) => fn),
    combine: jest.fn(() => 'combined-format'),
    timestamp: jest.fn(() => 'timestamp-format'),
    errors: jest.fn(() => 'errors-format'),
  },
  createLogger: jest.fn(),
}));

const buildEnvService = (env: 'development' | 'production') => ({
  get: jest.fn((key: string) => {
    if (key === 'INFRA_ENVIRONMENT') return env;
    return undefined;
  }),
});

describe('CustomLogger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let baseLoggerSpies: Record<string, jest.SpyInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    BackofficeConfigsSingleton.debugLogging = false;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    baseLoggerSpies = {
      log: jest.spyOn(ConsoleLogger.prototype, 'log').mockImplementation(() => undefined),
      error: jest.spyOn(ConsoleLogger.prototype, 'error').mockImplementation(() => undefined),
      warn: jest.spyOn(ConsoleLogger.prototype, 'warn').mockImplementation(() => undefined),
      debug: jest.spyOn(ConsoleLogger.prototype, 'debug').mockImplementation(() => undefined),
      verbose: jest.spyOn(ConsoleLogger.prototype, 'verbose').mockImplementation(() => undefined),
    };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    Object.values(baseLoggerSpies).forEach((spy) => spy.mockRestore());
  });

  describe('constructor', () => {
    it('should not initialize winston in a non-production environment', () => {
      const logger = new CustomLogger(buildEnvService('development') as any);

      logger.log('hello');

      expect(winston.createLogger).not.toHaveBeenCalled();
      expect(baseLoggerSpies.log).toHaveBeenCalled();
    });

    it('should initialize winston in a production environment', () => {
      const winstonLoggerMock = { log: jest.fn() };
      (winston.createLogger as jest.Mock).mockReturnValue(winstonLoggerMock);

      new CustomLogger(buildEnvService('production') as any);

      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should set the context name when provided in the constructor', () => {
      const logger = new CustomLogger(buildEnvService('development') as any, 'MyContext');

      logger.log('hi');

      expect(baseLoggerSpies.log.mock.calls[0][1]).toContain('MyContext');
    });
  });

  describe('setContextName', () => {
    it('should update the context used in subsequent log calls', () => {
      const logger = new CustomLogger(buildEnvService('development') as any);
      logger.setContextName('CustomContext');

      logger.log('message');

      expect(baseLoggerSpies.log.mock.calls[0][1]).toContain('CustomContext');
    });
  });

  describe('log levels (development, no winston)', () => {
    let logger: CustomLogger;

    beforeEach(() => {
      logger = new CustomLogger(buildEnvService('development') as any, 'TestCtx');
    });

    it('log() should format a simple string message', () => {
      logger.log('plain message');

      expect(baseLoggerSpies.log).toHaveBeenCalled();
      const [message] = baseLoggerSpies.log.mock.calls[0];
      expect(message).toBe('plain message');
    });

    it('error() should format an error message', () => {
      logger.error('boom');

      expect(baseLoggerSpies.error).toHaveBeenCalled();
    });

    it('warn() should format a warning message', () => {
      logger.warn('careful');

      expect(baseLoggerSpies.warn).toHaveBeenCalled();
    });

    it('verbose() should format a verbose message', () => {
      logger.verbose('details');

      expect(baseLoggerSpies.verbose).toHaveBeenCalled();
    });

    it('debug() should be a no-op when BackofficeConfigsSingleton.debugLogging is false', () => {
      BackofficeConfigsSingleton.debugLogging = false;

      logger.debug('should not appear');

      expect(baseLoggerSpies.debug).not.toHaveBeenCalled();
    });

    it('debug() should log when BackofficeConfigsSingleton.debugLogging is true', () => {
      BackofficeConfigsSingleton.debugLogging = true;

      logger.debug('should appear');

      expect(baseLoggerSpies.debug).toHaveBeenCalled();
    });

    it('should include the current RequestContext requestId when logging', () => {
      const context: IRequestContextModel = { requestId: 'req-42', startedAt: new Date() };

      RequestContext.run(context, () => logger.log('with context'));

      const [, contextArg] = baseLoggerSpies.log.mock.calls[0];
      expect(contextArg).toContain('req-42');
    });
  });

  describe('log levels (object context payload)', () => {
    let logger: CustomLogger;

    beforeEach(() => {
      logger = new CustomLogger(buildEnvService('development') as any, 'TestCtx');
    });

    it('should use a string context as the contextName', () => {
      logger.log('message', 'StringContext');

      const [, contextArg] = baseLoggerSpies.log.mock.calls[0];
      expect(contextArg).toContain('StringContext');
    });

    it('should extract errorName and message from an object context', () => {
      logger.error('Something failed', {
        errorName: 'CustomError',
        stack: 'Error: Something failed\n  at a\n  at b\n  at c\n  at d\n  at e',
      });

      expect(baseLoggerSpies.error).toHaveBeenCalled();
      const [message, contextArg] = baseLoggerSpies.error.mock.calls[0];
      expect(contextArg).toContain('CustomError');
      expect(message).toContain('Something failed');
    });

    it('should extract a bracketed context name from the message and strip it', () => {
      logger.warn('[OrdersService]: Order not found', { some: 'data' });

      const [message, contextArg] = baseLoggerSpies.warn.mock.calls[0];
      expect(contextArg).toContain('OrdersService');
      expect(message).not.toContain('[OrdersService]:');
      expect(message).toContain('Order not found');
    });

    it('should redact user/account/authentication fields but keep an authentication summary', () => {
      logger.error('Auth failure', {
        message: 'Auth failure',
        user: { accountId: 'acc-1', username: 'jdoe', id: 'user-1', name: 'John Doe' },
        account: { id: 'acc-1' },
      });

      expect(baseLoggerSpies.error).toHaveBeenCalled();
      const [message] = baseLoggerSpies.error.mock.calls[0];

      // Raw user/account payloads must not leak into the logged output.
      expect(message).not.toContain('"user"');
      expect(message).not.toContain('"account"');

      // An authentication summary should be present instead, with the expected shape.
      expect(message).toContain('"authentication"');
      const jsonStart = (message as string).indexOf('{');
      const logData = JSON.parse((message as string).slice(jsonStart));
      expect(logData.authentication).toEqual({
        accountId: 'acc-1',
        accountUsername: 'jdoe',
        userId: 'user-1',
        userName: 'John Doe',
      });
    });

    it('should fall back to the instance context name when no errorName/message is present in the context object', () => {
      logger.log('data only', { some: 'value' });

      expect(baseLoggerSpies.log).toHaveBeenCalled();
    });

    it('should not throw for a context object with a circular reference and should log a [Circular] sentinel', () => {
      const circular: Record<string, unknown> = { message: 'circular test' };
      circular.self = circular;

      expect(() => logger.error('Circular error', circular)).not.toThrow();

      const [message] = baseLoggerSpies.error.mock.calls[0];
      expect(message).toContain('[Circular]');
    });
  });

  describe('winston integration (production)', () => {
    it('should forward formatted log data to the winston logger', () => {
      const winstonLoggerMock = { log: jest.fn() };
      (winston.createLogger as jest.Mock).mockReturnValue(winstonLoggerMock);

      const logger = new CustomLogger(buildEnvService('production') as any, 'ProdCtx');

      logger.log('production message');

      expect(winstonLoggerMock.log).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({
          level: 'info',
          message: expect.stringContaining('production message'),
        }),
      );
    });

    it('should include a context payload when the message carries structured data', () => {
      const winstonLoggerMock = { log: jest.fn() };
      (winston.createLogger as jest.Mock).mockReturnValue(winstonLoggerMock);

      const logger = new CustomLogger(buildEnvService('production') as any, 'ProdCtx');

      logger.error('failure', { errorName: 'Boom', extra: 'value' });

      expect(winstonLoggerMock.log).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          level: 'error',
          context: expect.objectContaining({ extra: 'value' }),
        }),
      );
    });
  });
});
