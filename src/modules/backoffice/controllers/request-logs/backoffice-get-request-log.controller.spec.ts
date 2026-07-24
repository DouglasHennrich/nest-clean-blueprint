import { BackofficeGetRequestLogController } from './backoffice-get-request-log.controller';
import { Result } from '@/@shared/classes/result';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';

describe('BackofficeGetRequestLogController', () => {
  let controller: BackofficeGetRequestLogController;
  let getRequestLogService: { execute: jest.Mock };
  let requestLogPresenter: { present: jest.Mock };

  const requestLog: IBackofficeRequestLogModel = {
    id: 'log-1',
    method: 'GET',
    path: '/api/foods',
  };
  const presented = { id: 'log-1' };

  beforeEach(() => {
    getRequestLogService = { execute: jest.fn() };
    requestLogPresenter = { present: jest.fn().mockReturnValue(presented) };

    controller = new BackofficeGetRequestLogController(
      getRequestLogService,
      requestLogPresenter as any,
    );
  });

  it('should return the presented request log on success', async () => {
    getRequestLogService.execute.mockResolvedValue(Result.success(requestLog));

    const result = await controller.getRequestLog({ id: 'log-1' });

    expect(getRequestLogService.execute).toHaveBeenCalledWith({ id: 'log-1' });
    expect(requestLogPresenter.present).toHaveBeenCalledWith({ entity: requestLog });
    expect(result).toBe(presented);
  });

  it('should throw the error when the service fails', async () => {
    const error = new Error('not found');
    getRequestLogService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.getRequestLog({ id: 'log-1' })).rejects.toThrow('not found');
    expect(requestLogPresenter.present).not.toHaveBeenCalled();
  });
});
