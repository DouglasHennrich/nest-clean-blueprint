import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractRepository } from '@/@shared/classes/repository';
import { BackofficeAuditLogEntity } from '@/modules/backoffice/entities/audit-logs/backoffice-audit-log.entity';
import { IBackofficeAuditLogModel } from '../../models/audit-logs/backoffice-audit-log.struct';
import { TEnvService } from '@/modules/env/services/env.service';
import { CustomLogger } from '@/@shared/classes/custom-logger';

export abstract class IBackofficeAuditLogsRepository extends AbstractRepository<
  BackofficeAuditLogEntity,
  IBackofficeAuditLogModel
> {}

@Injectable()
export class BackofficeAuditLogsRepository extends IBackofficeAuditLogsRepository {
  constructor(
    @InjectRepository(BackofficeAuditLogEntity)
    readonly auditLogRepository: Repository<BackofficeAuditLogEntity>,
    readonly envService: TEnvService,
  ) {
    super(
      auditLogRepository,
      envService,
      new CustomLogger(envService, BackofficeAuditLogsRepository.name),
    );
  }
}
