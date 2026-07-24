import { UpdateBackofficeConfigsService } from './update-backoffice-configs.service';
import { Result } from '@/@shared/classes/result';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';

describe('UpdateBackofficeConfigsService', () => {
  let service: UpdateBackofficeConfigsService;
  let backofficeConfigsService: { updateConfigs: jest.Mock };
  let logger: { setContextName: jest.Mock; debug: jest.Mock };

  const config: IBackofficeConfigsModel = { id: 'config-1', debugLogging: true };

  beforeEach(() => {
    backofficeConfigsService = { updateConfigs: jest.fn() };
    logger = { setContextName: jest.fn(), debug: jest.fn() };

    service = new UpdateBackofficeConfigsService(backofficeConfigsService as any, logger as any);
  });

  it('should set the logger context name', () => {
    expect(logger.setContextName).toHaveBeenCalledWith(UpdateBackofficeConfigsService.name);
  });

  it('should validate, delegate and return the updated config', async () => {
    backofficeConfigsService.updateConfigs.mockResolvedValue(Result.success(config));

    const result = await service.execute({ debugLogging: true });

    expect(backofficeConfigsService.updateConfigs).toHaveBeenCalledWith({ debugLogging: true });
    expect(result.getValue()).toEqual(config);
  });

  it('should fail validation for an invalid dto', async () => {
    const result = await service.execute({ debugLogging: 123 } as any);

    expect(result.error).toBeDefined();
    expect(backofficeConfigsService.updateConfigs).not.toHaveBeenCalled();
  });

  it('should propagate errors from backofficeConfigsService.updateConfigs', async () => {
    const error = new Error('update failed');
    backofficeConfigsService.updateConfigs.mockResolvedValue(Result.fail(error));

    const result = await service.execute({ debugLogging: true });

    expect(result.error).toBe(error);
  });

  describe('validateDto', () => {
    it('should return success for a valid dto', () => {
      const result = service.validateDto({ debugLogging: true });

      expect(result.error).toBeUndefined();
      expect(result.getValue()).toEqual({ debugLogging: true });
    });

    it('should return failure for an invalid dto', () => {
      const result = service.validateDto({ debugLogging: 123 } as any);

      expect(result.error).toBeDefined();
    });
  });
});
