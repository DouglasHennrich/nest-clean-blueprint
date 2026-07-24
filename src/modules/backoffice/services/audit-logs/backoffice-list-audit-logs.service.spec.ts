import { BackofficeListBackofficeAuditLogsService } from './backoffice-list-audit-logs.service';
import { IBackofficeAuditLogModel } from '../../models/audit-logs/backoffice-audit-log.struct';

describe('BackofficeListBackofficeAuditLogsService', () => {
  let service: BackofficeListBackofficeAuditLogsService;
  let envService: { get: jest.Mock };
  let auditLogsRepository: { find: jest.Mock };
  let logger: { setContextName: jest.Mock; log: jest.Mock };

  const audit: IBackofficeAuditLogModel = {
    id: 'audit-1',
    method: 'GET',
    path: '/api/foods',
    endpoint: 'LIST_FOODS',
  };

  beforeEach(() => {
    envService = { get: jest.fn().mockReturnValue(20) };
    auditLogsRepository = { find: jest.fn() };
    logger = { setContextName: jest.fn(), log: jest.fn() };

    service = new BackofficeListBackofficeAuditLogsService(
      envService,
      auditLogsRepository as any,
      logger as any,
    );
  });

  it('should set the logger context name', () => {
    expect(logger.setContextName).toHaveBeenCalledWith(
      BackofficeListBackofficeAuditLogsService.name,
    );
  });

  it('should list audit logs with default pagination when no filters are given', async () => {
    auditLogsRepository.find.mockResolvedValue({ data: [audit], hasNextPage: false, total: 1 });

    const result = await service.execute({});

    expect(auditLogsRepository.find).toHaveBeenCalledWith({
      where: [{}],
      offset: 20,
      page: 1,
      order: { createdAt: 'DESC' },
    });
    expect(result.getValue()).toEqual({ data: [audit], hasNextPage: false, total: 1 });
  });

  it('should build the where condition from all provided filters', async () => {
    auditLogsRepository.find.mockResolvedValue({ data: [], hasNextPage: false, total: 0 });

    await service.execute({
      page: 2,
      offset: 10,
      userId: 'user-1',
      userEmail: 'user@test.com',
      action: 'CREATE',
      entityType: 'FOOD',
      entityId: 'entity-1',
      method: 'POST',
      statusCode: 201,
      careAssignmentId: 'care-1',
      patientId: 'patient-1',
    });

    expect(auditLogsRepository.find).toHaveBeenCalledWith({
      where: [
        {
          userId: 'user-1',
          userEmail: 'user@test.com',
          action: 'CREATE',
          entityType: 'FOOD',
          entityId: 'entity-1',
          method: 'POST',
          statusCode: 201,
          careAssignmentId: 'care-1',
          patientId: 'patient-1',
        },
      ],
      offset: 10,
      page: 2,
      order: { createdAt: 'DESC' },
    });
  });

  it('should apply a date range when startDate and endDate are provided', async () => {
    auditLogsRepository.find.mockResolvedValue({ data: [], hasNextPage: false, total: 0 });
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    await service.execute({ startDate, endDate });

    const callArgs = auditLogsRepository.find.mock.calls[0][0];
    expect(callArgs.where[0].createdAt).toBeDefined();
  });

  it('should default the end of the date range to now when only startDate is provided', async () => {
    auditLogsRepository.find.mockResolvedValue({ data: [], hasNextPage: false, total: 0 });

    await service.execute({ startDate: new Date('2024-01-01') });

    const callArgs = auditLogsRepository.find.mock.calls[0][0];
    expect(callArgs.where[0].createdAt).toBeDefined();
  });
});
