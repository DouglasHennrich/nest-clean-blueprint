import { BackofficeConfigsRepository } from './backoffice-configs.repository';
import { BackofficeConfigsEntity } from '../../entities/configs/backoffice-configs.entity';

describe('BackofficeConfigsRepository', () => {
  let repository: BackofficeConfigsRepository;
  let typeormRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    metadata: { tableName: string };
    manager: { connection: unknown };
  };
  let envService: { get: jest.Mock };

  const entity: BackofficeConfigsEntity = {
    id: 'config-1',
    debugLogging: true,
  } as BackofficeConfigsEntity;

  beforeEach(() => {
    typeormRepository = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      metadata: { tableName: 'backoffice_configs' },
      manager: { connection: {} },
    };
    envService = {
      get: jest.fn((key: string) => {
        if (key === 'UTILITIES_PAGINATION_LIMIT') return 20;
        if (key === 'INFRA_ENVIRONMENT') return 'test';
        return undefined;
      }),
    };

    repository = new BackofficeConfigsRepository(typeormRepository as any, envService);
  });

  describe('create', () => {
    it('should create and save a new config', async () => {
      typeormRepository.save.mockResolvedValue(entity);

      const result = await repository.create({ data: { debugLogging: true } });

      expect(typeormRepository.create).toHaveBeenCalledWith({ debugLogging: true });
      expect(typeormRepository.save).toHaveBeenCalled();
      expect(result).toEqual(entity);
    });
  });

  describe('findLast', () => {
    it('should find the last config ordered by createdAt DESC', async () => {
      typeormRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findLast({ where: {} });

      expect(typeormRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          order: { createdAt: 'DESC' },
        }),
      );
      expect(result).toEqual(entity);
    });

    it('should return undefined when no config exists', async () => {
      // AbstractRepository.toModel() normalizes a null entity to undefined,
      // matching its declared `Model | undefined` return type.
      typeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findLast({ where: {} });

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update an existing config', async () => {
      typeormRepository.findOne.mockResolvedValue(entity);
      const updated = { ...entity, debugLogging: false };
      typeormRepository.save.mockResolvedValue(updated);

      const result = await repository.update({ id: 'config-1', data: { debugLogging: false } });

      expect(typeormRepository.save).toHaveBeenCalledWith({
        ...entity,
        debugLogging: false,
        id: 'config-1',
      });
      expect(result).toEqual(updated);
    });

    it('should throw when the config does not exist', async () => {
      typeormRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.update({ id: 'missing', data: { debugLogging: false } }),
      ).rejects.toThrow('Entity with id missing not found');
    });
  });
});
