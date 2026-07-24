import { BackofficeConfigsService } from './backoffice-configs.service';
import { Result } from '@/@shared/classes/result';
import { BackofficeConfigsSingleton } from '../../singletons/backoffice-configs.singleton';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';

describe('BackofficeConfigsService', () => {
  let service: BackofficeConfigsService;
  let dataCacheService: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let repository: {
    findLast: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let logger: {
    setContextName: jest.Mock;
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    verbose: jest.Mock;
  };

  const config: IBackofficeConfigsModel = {
    id: 'config-1',
    debugLogging: true,
  };

  beforeEach(() => {
    dataCacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };
    repository = {
      findLast: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    service = new BackofficeConfigsService(dataCacheService as any, repository as any, logger);
  });

  describe('constructor', () => {
    it('should set the logger context name', () => {
      expect(logger.setContextName).toHaveBeenCalledWith(BackofficeConfigsService.name);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize the singleton by calling getConfigs', async () => {
      dataCacheService.get.mockResolvedValue(Result.success(config));

      await service.onModuleInit();

      expect(dataCacheService.get).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        'BackofficeConfigs singleton initialized successfully',
      );
    });

    it('should log and re-throw when initialization fails', async () => {
      const error = new Error('boom');
      dataCacheService.get.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('boom');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize BackofficeConfigs singleton'),
      );
    });
  });

  describe('getConfigs', () => {
    it('should return the existing config from the repository', async () => {
      dataCacheService.get.mockImplementation((_key: string, factory: () => unknown) => factory());
      repository.findLast.mockResolvedValue(config);

      const result = await service.getConfigs();

      expect(repository.findLast).toHaveBeenCalledWith({ where: {} });
      expect(repository.create).not.toHaveBeenCalled();
      expect(result.error).toBeUndefined();
      expect(result.getValue()).toEqual(config);
      expect(BackofficeConfigsSingleton.debugLogging).toBe(true);
    });

    it('should create a default config when none exists', async () => {
      dataCacheService.get.mockImplementation((_key: string, factory: () => unknown) => factory());
      repository.findLast.mockResolvedValue(undefined);
      const defaultConfig = { id: 'default-1', debugLogging: false };
      repository.create.mockResolvedValue(defaultConfig);

      const result = await service.getConfigs();

      expect(repository.create).toHaveBeenCalledWith({ data: { debugLogging: false } });
      expect(result.getValue()).toEqual(defaultConfig);
      expect(BackofficeConfigsSingleton.debugLogging).toBe(false);
    });

    it('should not touch the singleton when the cache result has an error', async () => {
      dataCacheService.get.mockResolvedValue(Result.fail(new Error('cache error')));
      BackofficeConfigsSingleton.setDebugLogging(true);

      const result = await service.getConfigs();

      expect(result.error).toBeDefined();
      expect(BackofficeConfigsSingleton.debugLogging).toBe(true);
    });

    it('should not touch the singleton when config value is missing', async () => {
      dataCacheService.get.mockResolvedValue(Result.success(undefined));
      BackofficeConfigsSingleton.setDebugLogging(true);

      const result = await service.getConfigs();

      expect(result.error).toBeUndefined();
      expect(BackofficeConfigsSingleton.debugLogging).toBe(true);
    });
  });

  describe('updateConfigs', () => {
    it('should update the config, refresh the cache and singleton', async () => {
      dataCacheService.get.mockResolvedValue(Result.success(config));
      const updated = { ...config, debugLogging: false };
      repository.update.mockResolvedValue(updated);

      const result = await service.updateConfigs({ debugLogging: false });

      expect(repository.update).toHaveBeenCalledWith({
        id: config.id,
        data: { debugLogging: false },
      });
      expect(dataCacheService.set).toHaveBeenCalledWith('backoffice-configs', updated, {
        shouldExpire: false,
      });
      expect(result.error).toBeUndefined();
      expect(result.getValue()).toEqual(updated);
      expect(BackofficeConfigsSingleton.debugLogging).toBe(false);
    });

    it('should propagate the error when getConfigs fails', async () => {
      const error = new Error('get failed');
      dataCacheService.get.mockResolvedValue(Result.fail(error));

      const result = await service.updateConfigs({ debugLogging: false });

      expect(result.error).toBe(error);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should fail when the repository update returns falsy', async () => {
      dataCacheService.get.mockResolvedValue(Result.success(config));
      repository.update.mockResolvedValue(undefined);

      const result = await service.updateConfigs({ debugLogging: false });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Failed to update backoffice configs');
    });

    it('should catch unexpected errors and log them', async () => {
      dataCacheService.get.mockResolvedValue(Result.success(config));
      const error = new Error('db down');
      repository.update.mockRejectedValue(error);

      const result = await service.updateConfigs({ debugLogging: false });

      expect(result.error).toBe(error);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('db down'));
    });
  });
});
