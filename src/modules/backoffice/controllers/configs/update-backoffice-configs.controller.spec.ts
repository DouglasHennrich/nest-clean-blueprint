import { UpdateBackofficeConfigsController } from './update-backoffice-configs.controller';
import { Result } from '@/@shared/classes/result';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';

describe('UpdateBackofficeConfigsController', () => {
  let controller: UpdateBackofficeConfigsController;
  let updateService: { execute: jest.Mock };
  let configsPresenter: { present: jest.Mock };

  const config: IBackofficeConfigsModel = { id: 'config-1', debugLogging: false };
  const presented = { id: 'config-1', debugLogging: false };

  beforeEach(() => {
    updateService = { execute: jest.fn() };
    configsPresenter = { present: jest.fn().mockReturnValue(presented) };

    controller = new UpdateBackofficeConfigsController(updateService, configsPresenter as any);
  });

  it('should update and return the presented config on success', async () => {
    updateService.execute.mockResolvedValue(Result.success(config));

    const result = await controller.handle({ debugLogging: false });

    expect(updateService.execute).toHaveBeenCalledWith({ debugLogging: false });
    expect(configsPresenter.present).toHaveBeenCalledWith({ entity: config });
    expect(result).toBe(presented);
  });

  it('should throw the error when the service fails', async () => {
    const error = new Error('boom');
    updateService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.handle({ debugLogging: false })).rejects.toThrow('boom');
    expect(configsPresenter.present).not.toHaveBeenCalled();
  });
});
