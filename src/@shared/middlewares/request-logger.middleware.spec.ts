import { Request, Response, NextFunction } from 'express';
import { RequestLoggerMiddleware } from './request-logger.middleware';
import { ILogger } from '@/@shared/classes/custom-logger';

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware;
  let logger: { setContextName: jest.Mock; debug: jest.Mock };
  let req: Partial<Request>;
  let res: { on: jest.Mock; statusCode: number };
  let next: NextFunction;
  let finishCallback: (() => void) | undefined;

  beforeEach(() => {
    logger = { setContextName: jest.fn(), debug: jest.fn() };
    middleware = new RequestLoggerMiddleware(logger as unknown as ILogger);
    finishCallback = undefined;
    res = {
      statusCode: 200,
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    next = jest.fn();
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('RequestLoggerMiddleware');
  });

  it('should log incoming request and register a finish listener for logged methods', () => {
    req = { method: 'GET', path: '/orders' };

    middleware.use(req as Request, res as unknown as Response, next);

    expect(logger.debug).toHaveBeenCalledWith('Incoming Request: GET /orders');
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should log the response summary when the finish event fires', () => {
    req = { method: 'POST', path: '/orders' };
    res.statusCode = 201;

    middleware.use(req as Request, res as unknown as Response, next);
    finishCallback?.();

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/^Response: POST \/orders - Status: 201 - Duration: \d+ms$/),
    );
  });

  it.each(['/', '/health', '/api/v1/health', '/metrics', '/favicon.ico'])(
    'should skip logging for ignored path %s',
    (path) => {
      req = { method: 'GET', path };

      middleware.use(req as Request, res as unknown as Response, next);

      expect(logger.debug).not.toHaveBeenCalled();
      expect(res.on).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    },
  );

  it('should skip logging for methods outside the logged set', () => {
    req = { method: 'OPTIONS', path: '/orders' };

    middleware.use(req as Request, res as unknown as Response, next);

    expect(logger.debug).not.toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should always call next() regardless of path', () => {
    req = { method: 'GET', path: '/favicon.ico' };

    middleware.use(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
