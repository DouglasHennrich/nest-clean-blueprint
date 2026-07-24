import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ZodError, z } from 'zod';
import { AllExceptionsFilter } from './exceptions.filter';
import { AbstractApplicationException } from '../errors/abstract-application-exception';
import { RequestContext, IRequestContextModel } from '../context/request.context';
import * as sentry from '../observability/sentry';

jest.mock('../observability/sentry', () => ({
  captureException: jest.fn(),
}));

class TestException extends AbstractApplicationException {
  constructor(message: string) {
    super(message, 'TestException', HttpStatus.CONFLICT);
  }
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let logger: { setContextName: jest.Mock; error: jest.Mock; warn: jest.Mock };
  let res: { status: jest.Mock; json: jest.Mock };
  let req: Record<string, unknown>;
  let host: ArgumentsHost;

  const buildHost = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = { setContextName: jest.fn(), error: jest.fn(), warn: jest.fn() };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    req = { url: '/orders', method: 'GET', path: '/orders' };
    host = buildHost();

    filter = new AllExceptionsFilter(logger as any);
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('AllExceptionsFilter');
  });

  describe('shouldIgnore', () => {
    it('should silently drop requests to /favicon.ico without touching the response', () => {
      req.path = '/favicon.ico';

      filter.catch(new Error('irrelevant'), host);

      expect(res.status).not.toHaveBeenCalled();
      expect(sentry.captureException).not.toHaveBeenCalled();
    });

    it('should process every other path normally', () => {
      req.path = '/orders';

      filter.catch(new Error('boom'), host);

      expect(res.status).toHaveBeenCalled();
    });
  });

  describe('captureException', () => {
    it('should call Sentry captureException for non-ignored exceptions', () => {
      const error = new Error('failure');

      filter.catch(error, host);

      expect(sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should not call Sentry captureException for ignored exceptions', () => {
      req.path = '/favicon.ico';

      filter.catch(new Error('failure'), host);

      expect(sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('requestId inclusion', () => {
    it('should include "no-id" when no RequestContext is active', () => {
      filter.catch(new Error('failure'), host);

      const body = res.json.mock.calls[0][0];
      expect(body.logId).toBe('no-id');
    });

    it('should include the active RequestContext requestId', () => {
      const context: IRequestContextModel = { requestId: 'req-999', startedAt: new Date() };

      RequestContext.run(context, () => filter.catch(new Error('failure'), host));

      const body = res.json.mock.calls[0][0];
      expect(body.logId).toBe('req-999');
    });
  });

  describe('exception type handling', () => {
    it('should use statusCode/message/name from an AbstractApplicationException', () => {
      const exception = new TestException('conflict happened');

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      const body = res.json.mock.calls[0][0];
      expect(body.message).toBe('conflict happened');
      expect(body.name).toBe('TestException');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should map ZodError to a 400 ValidationError with a populated errors[] array', () => {
      const schema = z.object({ name: z.string() });
      const parsed = schema.safeParse({});
      const zodError = parsed.success ? undefined : (parsed.error as ZodError);

      filter.catch(zodError, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const body = res.json.mock.calls[0][0];
      expect(body.name).toBe('ValidationError');
      expect(body.message).toBe('Validation failed');
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
      expect(body.errors[0]).toEqual(
        expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
      );
    });

    it('should read statusCode/name from a plain HttpException', () => {
      const exception = new HttpException('nope', HttpStatus.NOT_FOUND);

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should join an array of messages from HttpException getResponse()', () => {
      const exception = new HttpException(
        { message: ['name is required', 'email is required'], statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      const body = res.json.mock.calls[0][0];
      expect(body.message).toBe('name is required, email is required');
    });

    it('should use a string getResponse() as the message', () => {
      const exception = new HttpException('plain text response', HttpStatus.BAD_REQUEST);

      filter.catch(exception, host);

      const body = res.json.mock.calls[0][0];
      expect(body.message).toBe('plain text response');
    });

    it('should fall back to generic values for an unknown exception shape', () => {
      filter.catch('a raw string being thrown', host);

      const body = res.json.mock.calls[0][0];
      expect(body.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body.message).toBe('Internal server error');
      expect(body.name).toBe('InternalServerError');
    });
  });

  describe('logging strategy', () => {
    it('should log at error level for 5xx status codes', () => {
      const error: any = new Error('server exploded');
      error.status = HttpStatus.INTERNAL_SERVER_ERROR;

      filter.catch(error, host);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log at warn level for 4xx status codes', () => {
      const exception = new HttpException('bad input', HttpStatus.BAD_REQUEST);

      filter.catch(exception, host);

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should not log anything when the exception carries no stack trace', () => {
      filter.catch('no stack here', host);

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('response side effects', () => {
    it('should record the error message and stack on the request object', () => {
      const exception = new Error('side effect check');

      filter.catch(exception, host);

      expect(req.__errorMessage).toBe('side effect check');
      expect(req.__stackTrace).toBe(exception.stack);
    });

    it('should include the requested path and a timestamp in the response body', () => {
      req.url = '/orders/123';

      filter.catch(new Error('failure'), host);

      const body = res.json.mock.calls[0][0];
      expect(body.path).toBe('/orders/123');
      expect(typeof body.timestamp).toBe('string');
      expect(body.errors).toBeNull();
    });
  });
});
