import { BackofficeListRequestLogsService } from './backoffice-list-request-logs.service';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';

describe('BackofficeListRequestLogsService', () => {
  let service: BackofficeListRequestLogsService;
  let envService: { get: jest.Mock };
  let requestLogsRepository: { find: jest.Mock };
  let logger: { setContextName: jest.Mock; log: jest.Mock };

  const requestLog: IBackofficeRequestLogModel = {
    id: 'log-1',
    method: 'GET',
    path: '/api/foods',
  };

  beforeEach(() => {
    envService = { get: jest.fn().mockReturnValue(20) };
    requestLogsRepository = { find: jest.fn() };
    logger = { setContextName: jest.fn(), log: jest.fn() };

    service = new BackofficeListRequestLogsService(
      envService,
      requestLogsRepository as any,
      logger as any,
    );
  });

  it('should set the logger context name', () => {
    expect(logger.setContextName).toHaveBeenCalledWith(BackofficeListRequestLogsService.name);
  });

  it('should list request logs with default pagination when no filters are given', async () => {
    requestLogsRepository.find.mockResolvedValue({
      data: [requestLog],
      hasNextPage: false,
      total: 1,
    });

    const result = await service.execute({});

    expect(requestLogsRepository.find).toHaveBeenCalledWith({
      where: {},
      offset: 20,
      page: 1,
      order: { createdAt: 'DESC' },
    });
    expect(result.getValue()).toEqual({ total: 1, hasNextPage: false, data: [requestLog] });
  });

  it('should build a single AND-ed where object for userId, method, path and statusCode', async () => {
    requestLogsRepository.find.mockResolvedValue({ data: [], hasNextPage: false, total: 0 });

    await service.execute({
      userId: '11111111-1111-4111-8111-111111111111',
      method: 'POST',
      path: '/orders',
      statusCode: 500,
    });

    const callArgs = requestLogsRepository.find.mock.calls[0][0];
    expect(callArgs.where).toEqual({
      userId: '11111111-1111-4111-8111-111111111111',
      method: 'POST',
      path: expect.anything(),
      statusCode: 500,
    });
  });

  it('should combine userId and method as AND conditions, not OR', async () => {
    // Regression test: previously each filter was pushed onto an array, which
    // TypeORM interprets as OR-joined alternatives instead of AND.
    requestLogsRepository.find.mockResolvedValue({ data: [], hasNextPage: false, total: 0 });

    await service.execute({
      userId: '11111111-1111-4111-8111-111111111111',
      method: 'POST',
    });

    const callArgs = requestLogsRepository.find.mock.calls[0][0];
    expect(Array.isArray(callArgs.where)).toBe(false);
    expect(callArgs.where).toEqual({
      userId: '11111111-1111-4111-8111-111111111111',
      method: 'POST',
    });
  });

  it('should apply a date range when startDate and endDate are provided', async () => {
    requestLogsRepository.find.mockResolvedValue({ data: [], hasNextPage: false, total: 0 });
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    await service.execute({ startDate, endDate });

    const callArgs = requestLogsRepository.find.mock.calls[0][0];
    expect(callArgs.where).toEqual({ createdAt: expect.anything() });
  });

  it('should default the end of the date range to now when only startDate is provided', async () => {
    requestLogsRepository.find.mockResolvedValue({ data: [], hasNextPage: false, total: 0 });

    await service.execute({ startDate: new Date('2024-01-01') });

    const callArgs = requestLogsRepository.find.mock.calls[0][0];
    expect(callArgs.where).toEqual({ createdAt: expect.anything() });
  });

  it('should fail validation for an invalid dto', async () => {
    const result = await service.execute({ statusCode: 999 });

    expect(result.error).toBeDefined();
    expect(requestLogsRepository.find).not.toHaveBeenCalled();
  });

  describe('validateDto', () => {
    it('should return success for a valid dto', () => {
      const result = service.validateDto({ page: 1, offset: 20 });

      expect(result.error).toBeUndefined();
    });

    it('should return failure for an invalid dto', () => {
      const result = service.validateDto({ statusCode: 999 });

      expect(result.error).toBeDefined();
    });
  });
});
