import { Injectable } from '@nestjs/common';
import { Result } from '@/@shared/classes/result';
import { AbstractService } from '@/@shared/classes/service';
import { IBackofficeAuditLogModel } from '../../models/audit-logs/backoffice-audit-log.struct';
import { IBackofficeAuditLogsRepository } from '../../repositories/audit-logs/audit-logs.repository';
import { IPagination } from '@/@shared/classes/repository';
import { TEnvService } from '@/modules/env/services/env.service';
import { Between, FindOptionsWhere } from 'typeorm';
import { BackofficeAuditLogEntity } from '@/modules/backoffice/entities/audit-logs/backoffice-audit-log.entity';
import { ILogger } from '@/@shared/classes/custom-logger';
import { TBackofficeListBackofficeAuditLogsDtoQuerySchema } from '../../dto/audit-logs/backoffice-list-audit-logs.dto';

export abstract class TBackofficeListBackofficeAuditLogsService extends AbstractService<
  TBackofficeListBackofficeAuditLogsDtoQuerySchema,
  IPagination<IBackofficeAuditLogModel>
> {}

@Injectable()
export class BackofficeListBackofficeAuditLogsService implements TBackofficeListBackofficeAuditLogsService {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private envService: TEnvService,

    /// //////////////////////////
    //  Repositories
    /// //////////////////////////
    private auditLogsRepository: IBackofficeAuditLogsRepository,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    public logger: ILogger,
  ) {
    this.logger.setContextName(BackofficeListBackofficeAuditLogsService.name);
  }

  async execute({
    page = 1,
    offset = this.envService.get('UTILITIES_PAGINATION_LIMIT'),
    userId,
    userEmail,
    action,
    entityType,
    entityId,
    method,
    statusCode,
    startDate,
    endDate,
    careAssignmentId,
    patientId,
  }: TBackofficeListBackofficeAuditLogsDtoQuerySchema): Promise<
    Result<IPagination<IBackofficeAuditLogModel>>
  > {
    this.logger.log('Listing audit logs from backoffice');

    // Build where conditions
    const whereConditions: FindOptionsWhere<BackofficeAuditLogEntity>[] = [];

    const baseCondition: FindOptionsWhere<BackofficeAuditLogEntity> = {};

    if (userId) baseCondition.userId = userId;
    if (userEmail) baseCondition.userEmail = userEmail;
    if (action) baseCondition.action = action;
    if (entityType) baseCondition.entityType = entityType;
    if (entityId) baseCondition.entityId = entityId;
    if (method) baseCondition.method = method;
    if (statusCode) baseCondition.statusCode = statusCode;
    if (careAssignmentId) baseCondition.careAssignmentId = careAssignmentId;
    if (patientId) baseCondition.patientId = patientId;

    if (startDate || endDate) {
      const start = startDate || new Date(0);
      const end = endDate || new Date();
      baseCondition.createdAt = Between(start, end);
    }

    whereConditions.push(baseCondition);

    const pagination = await this.auditLogsRepository.find({
      where: whereConditions.length > 0 ? whereConditions : undefined,
      offset,
      page,
      order: {
        createdAt: 'DESC',
      },
    });

    return Result.success(pagination);
  }
}
