import { RequestLogHelper } from './request-log.helper';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IBackofficeRequestLogsRepository } from '@/modules/backoffice/repositories/request-logs/backoffice-request-logs.repository';

describe('RequestLogHelper', () => {
  let helper: RequestLogHelper;
  let repository: { create: jest.Mock; update: jest.Mock };
  let logger: { setContextName: jest.Mock; debug: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    repository = { create: jest.fn(), update: jest.fn() };
    logger = { setContextName: jest.fn(), debug: jest.fn(), error: jest.fn() };

    helper = new RequestLogHelper(
      repository as unknown as IBackofficeRequestLogsRepository,
      logger as unknown as ILogger,
    );
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('RequestLogHelper');
  });

  describe('createServiceRequestLog', () => {
    it('should create a RequestLog entity with method INTERNAL and the service name as path', async () => {
      const requestLog = { id: 'log-1' };
      repository.create.mockResolvedValue(requestLog);

      const result = await helper.createServiceRequestLog({
        serviceName: 'billing.service',
        userId: 'user-1',
        userEmail: 'user@example.com',
        userName: 'User',
        metadata: { amount: 100 },
      });

      expect(repository.create).toHaveBeenCalledWith({
        data: {
          method: 'INTERNAL',
          path: 'billing.service',
          userId: 'user-1',
          userEmail: 'user@example.com',
          userName: 'User',
          body: JSON.stringify({ amount: 100 }),
          statusCode: 200,
        },
      });
      expect(result).toBe(requestLog);
      expect(logger.debug).toHaveBeenCalledWith(
        'Service RequestLog created for billing.service: log-1',
      );
    });

    it('should omit body when metadata is not provided', async () => {
      repository.create.mockResolvedValue({ id: 'log-2' });

      await helper.createServiceRequestLog({ serviceName: 'internal.job' });

      expect(repository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ body: undefined }),
      });
    });

    it('should log and rethrow when repository.create fails', async () => {
      const error = new Error('db down');
      repository.create.mockRejectedValue(error);

      await expect(
        helper.createServiceRequestLog({ serviceName: 'billing.service' }),
      ).rejects.toThrow('db down');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create service RequestLog for billing.service',
        error,
      );
    });
  });

  describe('updateRequestLogStatus', () => {
    it('should update the RequestLog with the given status', async () => {
      repository.update.mockResolvedValue(undefined);

      await helper.updateRequestLogStatus('log-1', 500, 'Failed', 'stack-trace');

      expect(repository.update).toHaveBeenCalledWith({
        id: 'log-1',
        data: {
          statusCode: 500,
          errorMessage: 'Failed',
          stackTrace: 'stack-trace',
        },
      });
      expect(logger.debug).toHaveBeenCalledWith('RequestLog log-1 updated with status 500');
    });

    it('should not throw when repository.update fails, only log the error', async () => {
      const error = new Error('update failed');
      repository.update.mockRejectedValue(error);

      await expect(helper.updateRequestLogStatus('log-2', 200)).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith('Failed to update RequestLog log-2', error);
    });
  });
});
