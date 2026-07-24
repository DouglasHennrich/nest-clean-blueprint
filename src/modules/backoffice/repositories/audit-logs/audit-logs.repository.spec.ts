import { BackofficeAuditLogsRepository } from './audit-logs.repository';
import { BackofficeAuditLogEntity } from '@/modules/backoffice/entities/audit-logs/backoffice-audit-log.entity';

describe('BackofficeAuditLogsRepository', () => {
  let repository: BackofficeAuditLogsRepository;
  let typeormRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
    metadata: { tableName: string };
    manager: { connection: unknown };
  };
  let envService: { get: jest.Mock };

  const entity: BackofficeAuditLogEntity = {
    id: 'audit-1',
    method: 'GET',
    path: '/api/foods',
    endpoint: 'LIST_FOODS',
  } as BackofficeAuditLogEntity;

  beforeEach(() => {
    typeormRepository = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn(),
      findAndCount: jest.fn(),
      metadata: { tableName: 'audit_logs' },
      manager: { connection: {} },
    };
    envService = {
      get: jest.fn((key: string) => {
        if (key === 'UTILITIES_PAGINATION_LIMIT') return 20;
        if (key === 'INFRA_ENVIRONMENT') return 'test';
        return undefined;
      }),
    };

    repository = new BackofficeAuditLogsRepository(typeormRepository as any, envService);
  });

  describe('create', () => {
    it('should create and save an audit log', async () => {
      typeormRepository.save.mockResolvedValue(entity);

      const result = await repository.create({
        data: { method: 'GET', path: '/api/foods', endpoint: 'LIST_FOODS' },
      });

      expect(typeormRepository.save).toHaveBeenCalled();
      expect(result).toEqual(entity);
    });
  });

  describe('find', () => {
    it('should paginate audit logs and report hasNextPage', async () => {
      typeormRepository.findAndCount.mockResolvedValue([[entity], 21]);

      const result = await repository.find({ where: [{}], page: 1, offset: 20 });

      expect(typeormRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: [{}], skip: 0, take: 20 }),
      );
      expect(result).toEqual({ data: [entity], hasNextPage: true, total: 21 });
    });

    it('should report hasNextPage as false on the last page', async () => {
      typeormRepository.findAndCount.mockResolvedValue([[entity], 1]);

      const result = await repository.find({ where: [{}], page: 1, offset: 20 });

      expect(result.hasNextPage).toBe(false);
    });
  });
});
