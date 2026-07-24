import { GetBackofficeConfigsService } from './get-backoffice-configs.service';
import { Result } from '@/@shared/classes/result';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';

describe('GetBackofficeConfigsService', () => {
  let service: GetBackofficeConfigsService;
  let backofficeConfigsService: { getConfigs: jest.Mock };
  let logger: { setContextName: jest.Mock };

  const config: IBackofficeConfigsModel = { id: 'config-1', debugLogging: true };

  beforeEach(() => {
    backofficeConfigsService = { getConfigs: jest.fn() };
    logger = { setContextName: jest.fn() };

    service = new GetBackofficeConfigsService(backofficeConfigsService as any, logger as any);
  });

  it('should set the logger context name', () => {
    expect(logger.setContextName).toHaveBeenCalledWith(GetBackofficeConfigsService.name);
  });

  it('should delegate to backofficeConfigsService.getConfigs on success', async () => {
    backofficeConfigsService.getConfigs.mockResolvedValue(Result.success(config));

    const result = await service.execute();

    expect(backofficeConfigsService.getConfigs).toHaveBeenCalled();
    expect(result.getValue()).toEqual(config);
  });

  it('should propagate errors from backofficeConfigsService.getConfigs', async () => {
    const error = new Error('failed');
    backofficeConfigsService.getConfigs.mockResolvedValue(Result.fail(error));

    const result = await service.execute();

    expect(result.error).toBe(error);
  });
});
