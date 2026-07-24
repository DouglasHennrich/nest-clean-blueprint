import { Request, Response, NextFunction } from 'express';
import { CreateRequestLogEntityMiddleware } from './create-request-log-entity.middleware';
import { ILogger } from '../classes/custom-logger';
import { RequestContext } from '../context/request.context';
import { TRequestLogFlushSchedulerService } from '@/modules/queues/services/request-log-flush-scheduler.service';

describe('CreateRequestLogEntityMiddleware', () => {
  let middleware: CreateRequestLogEntityMiddleware;
  let logger: { setContextName: jest.Mock; error: jest.Mock };
  let scheduler: { enqueue: jest.Mock };
  let req: Partial<Request> & Record<string, unknown>;
  let res: { on: jest.Mock; statusCode: number };
  let next: NextFunction;
  let finishCallback: (() => void) | undefined;

  beforeEach(() => {
    jest.spyOn(RequestContext, 'getRequestId').mockReturnValue('ctx-request-id');
    logger = { setContextName: jest.fn(), error: jest.fn() };
    scheduler = { enqueue: jest.fn().mockResolvedValue(undefined) };

    middleware = new CreateRequestLogEntityMiddleware(
      scheduler as unknown as TRequestLogFlushSchedulerService,
      logger as unknown as ILogger,
    );

    finishCallback = undefined;
    res = {
      statusCode: 200,
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    next = jest.fn();

    req = {
      method: 'POST',
      path: '/orders/123',
      headers: { 'user-agent': 'jest-agent' },
      body: { name: 'Order' },
      params: { id: '123' },
      query: {},
      ip: '1.2.3.4',
      socket: { remoteAddress: '1.2.3.4' } as any,
      currentUser: { id: 'user-1', email: 'user@example.com', name: 'User', userType: 'admin' },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('CreateRequestLogEntityMiddleware');
  });

  it('should call next() synchronously', () => {
    middleware.use(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should register a finish listener and enqueue a payload once it fires', async () => {
    middleware.use(req as Request, res as unknown as Response, next);
    expect(scheduler.enqueue).not.toHaveBeenCalled();

    finishCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(scheduler.enqueue).toHaveBeenCalledTimes(1);
    const payload = scheduler.enqueue.mock.calls[0][0];
    expect(payload).toMatchObject({
      method: 'POST',
      path: '/orders/123',
      userId: 'user-1',
      userEmail: 'user@example.com',
      userName: 'User',
      userType: 'admin',
      statusCode: 200,
      requestId: 'ctx-request-id',
    });
    expect(payload.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('should default userAgent to "Unknown" when header is missing', async () => {
    req.headers = {};

    middleware.use(req as Request, res as unknown as Response, next);
    finishCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    const payload = scheduler.enqueue.mock.calls[0][0];
    expect(payload.userAgent).toBe('Unknown');
  });

  it('should extract UUID entity ids from the path', async () => {
    req = { ...req, path: '/orders/550e8400-e29b-41d4-a716-446655440000/items' };

    middleware.use(req as Request, res as unknown as Response, next);
    finishCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    const payload = scheduler.enqueue.mock.calls[0][0];
    expect(payload.entityIds).toBe(JSON.stringify(['550e8400-e29b-41d4-a716-446655440000']));
  });

  it('should leave entityIds undefined when path has no UUIDs', async () => {
    req = { ...req, path: '/orders/123' };

    middleware.use(req as Request, res as unknown as Response, next);
    finishCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    const payload = scheduler.enqueue.mock.calls[0][0];
    expect(payload.entityIds).toBeUndefined();
  });

  it('should log an error when enqueue rejects', async () => {
    scheduler.enqueue.mockRejectedValue(new Error('queue down'));

    middleware.use(req as Request, res as unknown as Response, next);
    finishCallback?.();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to enqueue request log: queue down'),
    );
  });

  it('should fall back to the early-captured user when currentUser changed by finish time', async () => {
    const earlyUser = { id: 'early-user', email: 'early@example.com', name: 'Early' };
    req.currentUser = earlyUser;

    middleware.use(req as Request, res as unknown as Response, next);
    // Simulate user being cleared before finish fires
    req.currentUser = undefined;
    finishCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    const payload = scheduler.enqueue.mock.calls[0][0];
    expect(payload.userId).toBe('early-user');
    expect(payload.userName).toBe('Early');
  });

  it('should read __errorMessage and __stackTrace set on the request', async () => {
    (req as any).__errorMessage = 'Something broke';
    (req as any).__stackTrace = 'stack-trace-here';

    middleware.use(req as Request, res as unknown as Response, next);
    finishCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    const payload = scheduler.enqueue.mock.calls[0][0];
    expect(payload.errorMessage).toBe('Something broke');
    expect(payload.stackTrace).toBe('stack-trace-here');
  });

  it('should read __responseBody set by the ResponseLogInterceptor', async () => {
    (req as any).__responseBody = JSON.stringify({ id: 'abc' });

    middleware.use(req as Request, res as unknown as Response, next);
    finishCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    const payload = scheduler.enqueue.mock.calls[0][0];
    expect(payload.responseBody).toBe(JSON.stringify({ id: 'abc' }));
  });

  it('should fall back to RequestContext.getRequestId early snapshot when unset at finish time', async () => {
    jest
      .spyOn(RequestContext, 'getRequestId')
      .mockReturnValueOnce('early-id')
      .mockReturnValue(undefined);

    middleware.use(req as Request, res as unknown as Response, next);
    finishCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    const payload = scheduler.enqueue.mock.calls[0][0];
    expect(payload.requestId).toBe('early-id');
  });
});
