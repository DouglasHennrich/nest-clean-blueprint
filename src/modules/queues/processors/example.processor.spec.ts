import { Job } from 'bullmq';
import { ExampleProcessor } from './example.processor';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IExampleJobDataModel } from '../dto/example-job.dto';

describe('ExampleProcessor', () => {
  let processor: ExampleProcessor;
  let logger: jest.Mocked<ILogger>;

  const buildJob = (data: IExampleJobDataModel): Job<IExampleJobDataModel> =>
    ({
      id: 'job-1',
      data,
    }) as unknown as Job<IExampleJobDataModel>;

  beforeEach(() => {
    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    processor = new ExampleProcessor(logger);
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('ExampleProcessor');
  });

  it('should process a job and log start/completion', async () => {
    const job = buildJob({ entityId: 'entity-1', payload: { foo: 'bar' } });

    await processor.process(job);

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Processing job job-1: entityId=entity-1'),
    );
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Job job-1 completed'));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log and rethrow when the underlying processing throws', async () => {
    const job = buildJob({ entityId: 'entity-2', payload: {} });
    // The "Job completed" log call happens inside the try block — throwing
    // there exercises the catch/rethrow path.
    logger.log.mockImplementation((message: string) => {
      if (typeof message === 'string' && message.includes('completed')) {
        throw new Error('boom');
      }
    });

    await expect(processor.process(job)).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Job job-1 failed: boom'));
  });
});
