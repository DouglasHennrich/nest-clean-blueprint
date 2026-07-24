import { BackofficeRequestLogsRepository } from './backoffice-request-logs.repository';
import { BackofficeRequestLogEntity } from '../../entities/request-logs/backoffice-request-log.entity';

describe('BackofficeRequestLogsRepository', () => {
  let repository: BackofficeRequestLogsRepository;
  let typeormRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    metadata: { tableName: string };
    manager: { connection: unknown };
  };
  let envService: { get: jest.Mock };

  const entity: BackofficeRequestLogEntity = {
    id: 'log-1',
    method: 'GET',
    path: '/api/foods',
  } as BackofficeRequestLogEntity;

  beforeEach(() => {
    typeormRepository = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      metadata: { tableName: 'backoffice_request_logs' },
      manager: { connection: {} },
    };
    envService = {
      get: jest.fn((key: string) => {
        if (key === 'UTILITIES_PAGINATION_LIMIT') return 20;
        if (key === 'INFRA_ENVIRONMENT') return 'test';
        return undefined;
      }),
    };

    repository = new BackofficeRequestLogsRepository(typeormRepository as any, envService);
  });

  describe('create', () => {
    it('should create and save a request log', async () => {
      typeormRepository.save.mockResolvedValue(entity);

      const result = await repository.create({
        data: { method: 'GET', path: '/api/foods' },
      });

      expect(typeormRepository.save).toHaveBeenCalled();
      expect(result).toEqual(entity);
    });
  });

  describe('find', () => {
    it('should paginate request logs', async () => {
      typeormRepository.findAndCount.mockResolvedValue([[entity], 1]);

      const result = await repository.find({ where: [], page: 1, offset: 20 });

      expect(typeormRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: [], skip: 0, take: 20 }),
      );
      expect(result).toEqual({ data: [entity], hasNextPage: false, total: 1 });
    });
  });

  describe('findById', () => {
    it('should find a request log by id', async () => {
      typeormRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findById({ id: 'log-1' });

      expect(typeormRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'log-1' } }),
      );
      expect(result).toEqual(entity);
    });

    it('should return undefined for an empty id', async () => {
      const result = await repository.findById({ id: '' });

      expect(result).toBeUndefined();
      expect(typeormRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return undefined when no request log is found', async () => {
      // AbstractRepository.toModel() normalizes a null entity to undefined,
      // matching its declared `Model | undefined` return type.
      typeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById({ id: 'missing' });

      expect(result).toBeUndefined();
    });
  });
});
