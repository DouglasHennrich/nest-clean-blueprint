import { Injectable } from '@nestjs/common';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IBackofficeRequestLogsRepository } from '@/modules/backoffice/repositories/request-logs/backoffice-request-logs.repository';
import { IBackofficeRequestLogModel } from '@/modules/backoffice/models/request-logs/backoffice-request-log.struct';

export interface ICreateServiceRequestLogDTO {
  serviceName: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  metadata?: Record<string, any>;
}

/**
 * Helper to create RequestLog entities for internal service calls
 * that don't originate from API requests (e.g., background jobs, internal triggers)
 */
@Injectable()
export class RequestLogHelper {
  constructor(
    private readonly backofficeRequestLogsRepository: IBackofficeRequestLogsRepository,
    private readonly logger: ILogger,
  ) {
    this.logger.setContextName(RequestLogHelper.name);
  }

  /**
   * Creates a RequestLog for internal service calls
   * Uses the service name as the "path" since there's no actual HTTP request
   */
  async createServiceRequestLog(
    dto: ICreateServiceRequestLogDTO,
  ): Promise<IBackofficeRequestLogModel> {
    try {
      const requestLog = await this.backofficeRequestLogsRepository.create({
        method: 'INTERNAL',
        path: dto.serviceName,
        userId: dto.userId,
        userEmail: dto.userEmail,
        userName: dto.userName,
        body: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
        statusCode: 200, // Default to success, can be updated later if needed
      });

      this.logger.debug(
        `Service RequestLog created for ${dto.serviceName}: ${requestLog.id}`,
      );

      return requestLog;
    } catch (error) {
      this.logger.error(
        `Failed to create service RequestLog for ${dto.serviceName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Updates the status of an existing RequestLog
   * Useful for marking success/failure after service execution
   */
  async updateRequestLogStatus(
    requestLogId: string,
    statusCode: number,
    errorMessage?: string,
    stackTrace?: string,
  ): Promise<void> {
    try {
      await this.backofficeRequestLogsRepository.update(requestLogId, {
        statusCode,
        errorMessage,
        stackTrace,
      });

      this.logger.debug(
        `RequestLog ${requestLogId} updated with status ${statusCode}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update RequestLog ${requestLogId}`, error);
      // Don't throw - this is a non-critical operation
    }
  }
}
