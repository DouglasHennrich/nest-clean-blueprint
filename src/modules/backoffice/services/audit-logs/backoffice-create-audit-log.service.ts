import { Injectable } from '@nestjs/common';
import { Result } from '@/@shared/classes/result';
import { AbstractService } from '@/@shared/classes/service';
import { IBackofficeAuditLogModel } from '../../models/audit-logs/backoffice-audit-log.struct';
import { IBackofficeAuditLogsRepository } from '../../repositories/audit-logs/audit-logs.repository';
import { ILogger } from '@/@shared/classes/custom-logger';
// import { AccountUserTypeEnum } from '@/modules/accounts/models/account.struct';

export interface IBackofficeCreateBackofficeAuditLogDtoModel {
  // HTTP Context
  method: string;
  path: string;
  endpoint: string;
  statusCode?: number;
  responseTime?: number;

  // User Context
  userId?: string;
  userEmail?: string;
  userName?: string;
  // userType?: AccountUserTypeEnum;

  // Professional Context
  professionalId?: string;
  professionalType?: string;

  // Request Data
  body?: Record<string, any>;
  params?: Record<string, any>;
  query?: Record<string, any>;
  headers?: Record<string, any>;
  files?: any[];

  // Response Data
  responseSize?: number;

  // Audit Context
  action: string;
  entityType?: string;
  entityId?: string;

  // Data Changes
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  changedFields?: string[];

  // Additional Context
  description?: string;
  metadata?: Record<string, any>;

  // Network Context
  ip?: string;
  userAgent?: string;

  // Error Tracking
  errorMessage?: string;
  stackTrace?: string;

  // Business Context
  careAssignmentId?: string;
  patientId?: string;
}

export abstract class TBackofficeCreateBackofficeAuditLogService extends AbstractService<
  IBackofficeCreateBackofficeAuditLogDtoModel,
  IBackofficeAuditLogModel
> {}

@Injectable()
export class BackofficeCreateBackofficeAuditLogService implements TBackofficeCreateBackofficeAuditLogService {
  constructor(
    /// //////////////////////////
    //  Repositories
    /// //////////////////////////
    private auditLogsRepository: IBackofficeAuditLogsRepository,

    public logger: ILogger,
  ) {
    this.logger.setContextName(BackofficeCreateBackofficeAuditLogService.name);
  }

  /**
   * Sanitizes sensitive data before saving to the database
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      'password',
      'token',
      'refreshToken',
      'accessToken',
      'authorization',
      'cookie',
      'secret',
      'apiKey',
      'creditCard',
    ];

    const sanitized = { ...data };

    for (const key in sanitized) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  async execute(
    dto: IBackofficeCreateBackofficeAuditLogDtoModel,
  ): Promise<Result<IBackofficeAuditLogModel>> {
    try {
      const audit = await this.auditLogsRepository.create({
        data: {
          method: dto.method,
          path: dto.path,
          endpoint: dto.endpoint,
          statusCode: dto.statusCode,
          responseTime: dto.responseTime,
          userId: dto.userId,
          userEmail: dto.userEmail,
          userName: dto.userName,
          // userType: dto.userType as 'USER' | 'ADMIN',
          professionalId: dto.professionalId,
          professionalType: dto.professionalType,
          body: dto.body ? JSON.stringify(this.sanitizeData(dto.body)) : undefined,
          params: dto.params ? JSON.stringify(dto.params) : undefined,
          query: dto.query ? JSON.stringify(dto.query) : undefined,
          headers: dto.headers ? JSON.stringify(this.sanitizeData(dto.headers)) : undefined,
          files: dto.files
            ? /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
              JSON.stringify(dto.files.map((f: any) => f.originalname))
            : undefined,
          responseSize: dto.responseSize,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          previousData: dto.previousData ? JSON.stringify(dto.previousData) : undefined,
          newData: dto.newData ? JSON.stringify(dto.newData) : undefined,
          changedFields: dto.changedFields ? JSON.stringify(dto.changedFields) : undefined,
          description: dto.description,
          metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
          ip: dto.ip,
          userAgent: dto.userAgent,
          errorMessage: dto.errorMessage,
          stackTrace: dto.stackTrace,
          careAssignmentId: dto.careAssignmentId,
          patientId: dto.patientId,
        },
      });

      return Result.success(audit);
    } catch (error) {
      // Never fail the main request due to an audit error
      this.logger.error(`Failed to create audit log: ${(error as Error).message}`);
      return Result.success({} as IBackofficeAuditLogModel);
    }
  }
}
