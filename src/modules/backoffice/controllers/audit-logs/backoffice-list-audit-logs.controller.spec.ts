import { BackofficeListBackofficeAuditLogsController } from './backoffice-list-audit-logs.controller';
import { Result } from '@/@shared/classes/result';
import { IBackofficeAuditLogModel } from '../../models/audit-logs/backoffice-audit-log.struct';

describe('BackofficeListBackofficeAuditLogsController', () => {
  let controller: BackofficeListBackofficeAuditLogsController;
  let listBackofficeAuditLogsService: { execute: jest.Mock };
  let auditLogPresenter: { presentMany: jest.Mock };

  const audit: IBackofficeAuditLogModel = {
    id: 'audit-1',
    method: 'GET',
    path: '/api/foods',
    endpoint: 'LIST_FOODS',
  };
  const presented = [{ id: 'audit-1' }];

  beforeEach(() => {
    listBackofficeAuditLogsService = { execute: jest.fn() };
    auditLogPresenter = { presentMany: jest.fn().mockReturnValue(presented) };

    controller = new BackofficeListBackofficeAuditLogsController(
      listBackofficeAuditLogsService,
      auditLogPresenter as any,
    );
  });

  it('should return the presented paginated list on success', async () => {
    listBackofficeAuditLogsService.execute.mockResolvedValue(
      Result.success({ data: [audit], hasNextPage: true, total: 5 }),
    );

    const result = await controller.listBackofficeAuditLogs({});

    expect(listBackofficeAuditLogsService.execute).toHaveBeenCalledWith({});
    expect(auditLogPresenter.presentMany).toHaveBeenCalledWith({ entities: [audit] });
    expect(result).toEqual({ data: presented, hasNextPage: true, total: 5 });
  });

  it('should throw the error when the service fails', async () => {
    const error = new Error('boom');
    listBackofficeAuditLogsService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.listBackofficeAuditLogs({})).rejects.toThrow('boom');
    expect(auditLogPresenter.presentMany).not.toHaveBeenCalled();
  });
});
