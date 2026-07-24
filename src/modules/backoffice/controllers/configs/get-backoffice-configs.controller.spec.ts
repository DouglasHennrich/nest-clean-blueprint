import { GetBackofficeConfigsController } from './get-backoffice-configs.controller';
import { Result } from '@/@shared/classes/result';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';

describe('GetBackofficeConfigsController', () => {
  let controller: GetBackofficeConfigsController;
  let getService: { execute: jest.Mock };
  let configsPresenter: { present: jest.Mock };

  const config: IBackofficeConfigsModel = { id: 'config-1', debugLogging: true };
  const presented = { id: 'config-1', debugLogging: true };

  beforeEach(() => {
    getService = { execute: jest.fn() };
    configsPresenter = { present: jest.fn().mockReturnValue(presented) };

    controller = new GetBackofficeConfigsController(getService, configsPresenter as any);
  });

  it('should return the presented config on success', async () => {
    getService.execute.mockResolvedValue(Result.success(config));

    const result = await controller.getConfigs();

    expect(getService.execute).toHaveBeenCalled();
    expect(configsPresenter.present).toHaveBeenCalledWith({ entity: config });
    expect(result).toBe(presented);
  });

  it('should throw the error when the service fails', async () => {
    const error = new Error('boom');
    getService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.getConfigs()).rejects.toThrow('boom');
    expect(configsPresenter.present).not.toHaveBeenCalled();
  });
});
