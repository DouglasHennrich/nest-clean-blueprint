import { BackofficeGetRequestLogService } from './backoffice-get-request-log.service';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';
import { BackofficeRequestLogNotFoundException } from '../../errors/request-logs/backoffice-request-log-not-found.exception';

describe('BackofficeGetRequestLogService', () => {
  let service: BackofficeGetRequestLogService;
  let requestLogsRepository: { findById: jest.Mock };
  let logger: { setContextName: jest.Mock; log: jest.Mock };

  const requestLog: IBackofficeRequestLogModel = {
    id: '11111111-1111-4111-8111-111111111111',
    method: 'GET',
    path: '/api/foods',
  };

  beforeEach(() => {
    requestLogsRepository = { findById: jest.fn() };
    logger = { setContextName: jest.fn(), log: jest.fn() };

    service = new BackofficeGetRequestLogService(requestLogsRepository as any, logger as any);
  });

  it('should set the logger context name', () => {
    expect(logger.setContextName).toHaveBeenCalledWith(BackofficeGetRequestLogService.name);
  });

  it('should return the request log when found', async () => {
    requestLogsRepository.findById.mockResolvedValue(requestLog);

    const result = await service.execute({ id: requestLog.id });

    expect(requestLogsRepository.findById).toHaveBeenCalledWith({ id: requestLog.id });
    expect(result.error).toBeUndefined();
    expect(result.getValue()).toEqual(requestLog);
  });

  it('should fail with a not-found exception when the request log does not exist', async () => {
    requestLogsRepository.findById.mockResolvedValue(undefined);

    const result = await service.execute({ id: requestLog.id });

    expect(result.error).toBeInstanceOf(BackofficeRequestLogNotFoundException);
    expect(result.getValue()).toBeNull();
  });

  it('should fail validation for an invalid id', async () => {
    const result = await service.execute({ id: 'not-a-uuid' });

    expect(result.error).toBeDefined();
    expect(requestLogsRepository.findById).not.toHaveBeenCalled();
  });

  describe('validateDto', () => {
    it('should return success for a valid dto', () => {
      const result = service.validateDto({ id: requestLog.id });

      expect(result.error).toBeUndefined();
      expect(result.getValue()).toEqual({ id: requestLog.id });
    });

    it('should return failure for an invalid dto', () => {
      const result = service.validateDto({ id: 'not-a-uuid' });

      expect(result.error).toBeDefined();
    });
  });
});
