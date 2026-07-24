import {
  BackofficeCreateBackofficeAuditLogService,
  IBackofficeCreateBackofficeAuditLogDtoModel,
} from './backoffice-create-audit-log.service';
import { IBackofficeAuditLogModel } from '../../models/audit-logs/backoffice-audit-log.struct';

describe('BackofficeCreateBackofficeAuditLogService', () => {
  let service: BackofficeCreateBackofficeAuditLogService;
  let auditLogsRepository: { create: jest.Mock };
  let logger: { setContextName: jest.Mock; error: jest.Mock };

  const baseDto: IBackofficeCreateBackofficeAuditLogDtoModel = {
    method: 'POST',
    path: '/api/foods',
    endpoint: 'CREATE_FOOD',
    action: 'CREATE',
  };

  beforeEach(() => {
    auditLogsRepository = { create: jest.fn() };
    logger = { setContextName: jest.fn(), error: jest.fn() };

    service = new BackofficeCreateBackofficeAuditLogService(
      auditLogsRepository as any,
      logger as any,
    );
  });

  it('should set the logger context name', () => {
    expect(logger.setContextName).toHaveBeenCalledWith(
      BackofficeCreateBackofficeAuditLogService.name,
    );
  });

  it('should create an audit log with the basic fields', async () => {
    const audit = { id: 'audit-1', ...baseDto } as unknown as IBackofficeAuditLogModel;
    auditLogsRepository.create.mockResolvedValue(audit);

    const result = await service.execute(baseDto);

    expect(auditLogsRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        method: 'POST',
        path: '/api/foods',
        endpoint: 'CREATE_FOOD',
        action: 'CREATE',
      }),
    });
    expect(result.error).toBeUndefined();
    expect(result.getValue()).toEqual(audit);
  });

  it('should sanitize sensitive fields in body/headers before saving', async () => {
    auditLogsRepository.create.mockResolvedValue({ id: 'audit-2' });

    await service.execute({
      ...baseDto,
      body: { password: 'secret', name: 'John' },
      headers: { authorization: 'Bearer token', accept: 'application/json' },
      params: { id: '1' },
      query: { page: 1 },
      files: [{ originalname: 'file.png' }],
      previousData: { name: 'old' },
      newData: { name: 'new' },
      changedFields: ['name'],
      metadata: { foo: 'bar' },
    });

    const callArgs = auditLogsRepository.create.mock.calls[0][0].data;

    expect(JSON.parse(callArgs.body)).toEqual({ password: '[REDACTED]', name: 'John' });
    expect(JSON.parse(callArgs.headers)).toEqual({
      authorization: '[REDACTED]',
      accept: 'application/json',
    });
    expect(JSON.parse(callArgs.params)).toEqual({ id: '1' });
    expect(JSON.parse(callArgs.query)).toEqual({ page: 1 });
    expect(JSON.parse(callArgs.files)).toEqual(['file.png']);
    expect(JSON.parse(callArgs.previousData)).toEqual({ name: 'old' });
    expect(JSON.parse(callArgs.newData)).toEqual({ name: 'new' });
    expect(JSON.parse(callArgs.changedFields)).toEqual(['name']);
    expect(JSON.parse(callArgs.metadata)).toEqual({ foo: 'bar' });
  });

  it('should never fail the request when the repository throws, returning an empty success', async () => {
    const error = new Error('db down');
    auditLogsRepository.create.mockRejectedValue(error);

    const result = await service.execute(baseDto);

    expect(result.error).toBeUndefined();
    expect(result.getValue()).toEqual({});
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('db down'));
  });
});
