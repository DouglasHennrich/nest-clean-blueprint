import { BackofficeCreateRequestLogService } from './backoffice-create-request-log.service';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';

describe('BackofficeCreateRequestLogService', () => {
  let service: BackofficeCreateRequestLogService;
  let requestLogsRepository: { create: jest.Mock };
  let logger: { setContextName: jest.Mock };

  const requestLog: IBackofficeRequestLogModel = {
    id: 'log-1',
    method: 'GET',
    path: '/api/foods',
  };

  beforeEach(() => {
    requestLogsRepository = { create: jest.fn() };
    logger = { setContextName: jest.fn() };

    service = new BackofficeCreateRequestLogService(requestLogsRepository as any, logger as any);
  });

  it('should set the logger context name', () => {
    expect(logger.setContextName).toHaveBeenCalledWith(BackofficeCreateRequestLogService.name);
  });

  it('should create a request log and return it', async () => {
    requestLogsRepository.create.mockResolvedValue(requestLog);

    const result = await service.execute({ method: 'GET', path: '/api/foods' });

    expect(requestLogsRepository.create).toHaveBeenCalledWith({
      data: { method: 'GET', path: '/api/foods' },
    });
    expect(result.error).toBeUndefined();
    expect(result.getValue()).toEqual(requestLog);
  });
});
