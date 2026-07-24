import { BackofficeFlushRequestLogQueueController } from './backoffice-flush-request-log-queue.controller';
import { Result } from '@/@shared/classes/result';

describe('BackofficeFlushRequestLogQueueController', () => {
  let controller: BackofficeFlushRequestLogQueueController;
  let flushRequestLogQueueService: { execute: jest.Mock };
  let requestLogPresenter: { presentSuccess: jest.Mock };

  beforeEach(() => {
    flushRequestLogQueueService = { execute: jest.fn() };
    requestLogPresenter = {
      presentSuccess: jest.fn().mockReturnValue({ success: true }),
    };

    controller = new BackofficeFlushRequestLogQueueController(
      flushRequestLogQueueService,
      requestLogPresenter as any,
    );
  });

  it('should trigger the flush and return a success envelope', async () => {
    flushRequestLogQueueService.execute.mockResolvedValue(Result.success());

    const result = await controller.flushRequestLogQueue();

    expect(flushRequestLogQueueService.execute).toHaveBeenCalled();
    expect(requestLogPresenter.presentSuccess).toHaveBeenCalledWith({
      message: 'request-log-flush job triggered successfully',
    });
    expect(result).toEqual({ success: true });
  });

  it('should throw the error when the service fails', async () => {
    const error = new Error('boom');
    flushRequestLogQueueService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.flushRequestLogQueue()).rejects.toThrow('boom');
    expect(requestLogPresenter.presentSuccess).not.toHaveBeenCalled();
  });
});
