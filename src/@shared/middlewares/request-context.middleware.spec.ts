import { Request, Response, NextFunction } from 'express';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContext } from '../context/request.context';
import { Normalize } from '../utils/normalize';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'generated-uuid') }));

describe('RequestContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let req: Partial<Request>;
  let res: { setHeader: jest.Mock };
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new RequestContextMiddleware();
    req = {
      headers: { 'user-agent': 'jest-agent' },
      method: 'GET',
      path: '/orders',
      query: { page: '1' },
      body: { foo: 'bar' },
      params: { id: '123' },
      ip: '1.2.3.4',
      socket: { remoteAddress: '1.2.3.4' } as any,
    };
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  it('should generate a UUID request id when x-request-id header is absent', () => {
    middleware.use(req as Request, res as unknown as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'generated-uuid');
  });

  it('should reuse x-request-id header when present', () => {
    req.headers = { ...req.headers, 'x-request-id': 'incoming-id' };

    middleware.use(req as Request, res as unknown as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'incoming-id');
  });

  it('should seed RequestContext with request data retrievable inside next()', () => {
    req.headers = { ...req.headers, 'x-user-timezone': 'America/Sao_Paulo' };
    let capturedContext: ReturnType<typeof RequestContext.getContext>;

    next = jest.fn(() => {
      capturedContext = RequestContext.getContext();
    });

    middleware.use(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(capturedContext).toMatchObject({
      requestId: 'generated-uuid',
      userTimezone: 'America/Sao_Paulo',
      ip: Normalize.realIp(req as Request),
      userAgent: 'jest-agent',
      method: 'GET',
      path: '/orders',
      query: { page: '1' },
      body: { foo: 'bar' },
      params: { id: '123' },
    });
    expect(capturedContext?.startedAt).toBeInstanceOf(Date);
  });

  it('should not leak context outside of the run() callback', () => {
    middleware.use(req as Request, res as unknown as Response, next);

    expect(RequestContext.getContext()).toBeUndefined();
  });

  it('should leave userTimezone undefined when header is absent', () => {
    let capturedContext: ReturnType<typeof RequestContext.getContext>;
    next = jest.fn(() => {
      capturedContext = RequestContext.getContext();
    });

    middleware.use(req as Request, res as unknown as Response, next);

    expect(capturedContext?.userTimezone).toBeUndefined();
  });

  it('should always call next()', () => {
    middleware.use(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
