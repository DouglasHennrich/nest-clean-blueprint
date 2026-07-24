import { BackofficeListRequestLogsController } from './backoffice-list-request-logs.controller';
import { Result } from '@/@shared/classes/result';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';

describe('BackofficeListRequestLogsController', () => {
  let controller: BackofficeListRequestLogsController;
  let listRequestLogsService: { execute: jest.Mock };
  let requestLogPresenter: { presentMany: jest.Mock };

  const requestLog: IBackofficeRequestLogModel = {
    id: 'log-1',
    method: 'GET',
    path: '/api/foods',
  };
  const presented = [{ id: 'log-1' }];

  beforeEach(() => {
    listRequestLogsService = { execute: jest.fn() };
    requestLogPresenter = { presentMany: jest.fn().mockReturnValue(presented) };

    controller = new BackofficeListRequestLogsController(
      listRequestLogsService,
      requestLogPresenter as any,
    );
  });

  it('should return the presented paginated list on success', async () => {
    listRequestLogsService.execute.mockResolvedValue(
      Result.success({ data: [requestLog], hasNextPage: false, total: 1 }),
    );

    const result = await controller.listRequestLogs({});

    expect(listRequestLogsService.execute).toHaveBeenCalledWith({});
    expect(requestLogPresenter.presentMany).toHaveBeenCalledWith({ entities: [requestLog] });
    expect(result).toEqual({ data: presented, hasNextPage: false, total: 1 });
  });

  it('should throw the error when the service fails', async () => {
    const error = new Error('boom');
    listRequestLogsService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.listRequestLogs({})).rejects.toThrow('boom');
    expect(requestLogPresenter.presentMany).not.toHaveBeenCalled();
  });
});
