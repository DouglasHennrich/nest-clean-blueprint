import { Job, UnrecoverableError } from 'bullmq';
import { RequestLogFlushProcessor } from './request-log-flush.processor';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IBackofficeRequestLogsRepository } from '@/modules/backoffice/repositories/request-logs/backoffice-request-logs.repository';

describe('RequestLogFlushProcessor', () => {
  let processor: RequestLogFlushProcessor;
  let requestLogsRepository: jest.Mocked<IBackofficeRequestLogsRepository>;
  let redisClient: { lrange: jest.Mock; ltrim: jest.Mock };
  let logger: jest.Mocked<ILogger>;
  let job: jest.Mocked<Job>;

  beforeEach(() => {
    requestLogsRepository = {
      bulkCreate: jest.fn(),
    } as unknown as jest.Mocked<IBackofficeRequestLogsRepository>;

    redisClient = {
      lrange: jest.fn(),
      ltrim: jest.fn().mockResolvedValue('OK'),
    };

    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    job = {
      id: 'flush-1',
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Job>;

    processor = new RequestLogFlushProcessor(requestLogsRepository, redisClient as any, logger);
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('RequestLogFlushProcessor');
  });

  it('should return early when the Redis list is empty', async () => {
    redisClient.lrange.mockResolvedValue([]);

    await processor.process(job);

    expect(job.log).toHaveBeenCalledWith('Redis list is empty — nothing to flush');
    expect(requestLogsRepository.bulkCreate).not.toHaveBeenCalled();
  });

  it('should return early when rawItems is null/undefined-ish', async () => {
    redisClient.lrange.mockResolvedValue(undefined);

    await processor.process(job);

    expect(requestLogsRepository.bulkCreate).not.toHaveBeenCalled();
  });

  it('should throw UnrecoverableError when LRANGE fails', async () => {
    redisClient.lrange.mockRejectedValue(new Error('redis down'));

    await expect(processor.process(job)).rejects.toThrow(UnrecoverableError);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to LRANGE Redis list: redis down'),
    );
  });

  it('should skip malformed JSON payloads and process the valid ones', async () => {
    redisClient.lrange.mockResolvedValue([
      'not-json{{{',
      JSON.stringify({ method: 'GET', path: '/x' }),
    ]);
    requestLogsRepository.bulkCreate.mockResolvedValue([]);

    await processor.process(job);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Skipping malformed request log payload'),
    );
    expect(requestLogsRepository.bulkCreate).toHaveBeenCalledTimes(1);
    expect(redisClient.ltrim).toHaveBeenCalledWith('pitanga:request-logs:pending', 2, -1);
  });

  it('should return early when every item is malformed', async () => {
    redisClient.lrange.mockResolvedValue(['not-json', '{also bad']);

    await processor.process(job);

    expect(job.log).toHaveBeenCalledWith('All read items were malformed — nothing to insert');
    expect(requestLogsRepository.bulkCreate).not.toHaveBeenCalled();
  });

  it('should bulk insert truncated payloads and trim the Redis list on success', async () => {
    const longBody = 'x'.repeat(10_050);
    redisClient.lrange.mockResolvedValue([
      JSON.stringify({ method: 'POST', path: '/y', body: longBody }),
    ]);
    requestLogsRepository.bulkCreate.mockResolvedValue([]);

    await processor.process(job);

    expect(requestLogsRepository.bulkCreate).toHaveBeenCalledWith({
      data: [
        {
          data: expect.objectContaining({
            body: 'x'.repeat(10_000),
          }),
        },
      ],
      options: { noModelReturn: true },
    });
    expect(redisClient.ltrim).toHaveBeenCalledWith('pitanga:request-logs:pending', 1, -1);
  });

  it('should throw UnrecoverableError and not trim when bulkCreate fails', async () => {
    redisClient.lrange.mockResolvedValue([JSON.stringify({ method: 'GET', path: '/z' })]);
    requestLogsRepository.bulkCreate.mockRejectedValue(new Error('insert failed'));

    await expect(processor.process(job)).rejects.toThrow(UnrecoverableError);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to bulk-insert request logs: insert failed'),
    );
    expect(redisClient.ltrim).not.toHaveBeenCalled();
  });

  it('should warn (non-fatal) when LTRIM fails after a successful insert', async () => {
    redisClient.lrange.mockResolvedValue([JSON.stringify({ method: 'GET', path: '/w' })]);
    requestLogsRepository.bulkCreate.mockResolvedValue([]);
    redisClient.ltrim.mockRejectedValue(new Error('trim failed'));

    await processor.process(job);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'LTRIM failed after successful INSERT (may cause duplicates): trim failed',
      ),
    );
  });

  it('should not truncate fields that are within the length limits', async () => {
    redisClient.lrange.mockResolvedValue([
      JSON.stringify({ method: 'GET', path: '/short', body: 'short-body' }),
    ]);
    requestLogsRepository.bulkCreate.mockResolvedValue([]);

    await processor.process(job);

    const [[callArg]] = requestLogsRepository.bulkCreate.mock.calls;
    expect(callArg.data[0].data).toEqual(expect.objectContaining({ body: 'short-body' }));
  });
});
