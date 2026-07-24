import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { AbstractRepository } from '@/@shared/classes/repository';
import { CustomLogger } from '@/@shared/classes/custom-logger';
import { TEnvService } from '@/modules/env/services/env.service';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';
import { BackofficeRequestLogEntity } from '../../entities/request-logs/backoffice-request-log.entity';

export abstract class IBackofficeRequestLogsRepository extends AbstractRepository<
  BackofficeRequestLogEntity,
  IBackofficeRequestLogModel
> {}

@Injectable()
export class BackofficeRequestLogsRepository extends IBackofficeRequestLogsRepository {
  constructor(
    @InjectRepository(BackofficeRequestLogEntity)
    readonly requestLogRepository: Repository<BackofficeRequestLogEntity>,
    readonly envService: TEnvService,
  ) {
    super(
      requestLogRepository,
      envService,
      new CustomLogger(envService, BackofficeRequestLogsRepository.name),
    );
  }
}
