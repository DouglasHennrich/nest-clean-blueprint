import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import {
  backofficeListBackofficeAuditLogsDtoQuerySchema,
  TBackofficeListBackofficeAuditLogsDtoQuerySchema,
} from '../../dto/audit-logs/backoffice-list-audit-logs.dto';
import { TBackofficeListBackofficeAuditLogsService } from '../../services/audit-logs/backoffice-list-audit-logs.service';
import { ReqContext } from '@/@decorators/request-context.decorator';
import { IRequestContext } from '@/@shared/protocols/request-context.struct';
import { BackofficeToken } from '../../decorators/backoffice.decorator';
import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';

@Controller('backoffice/audit-logs')
export class BackofficeListBackofficeAuditLogsController {
  constructor(
    private listBackofficeAuditLogsService: TBackofficeListBackofficeAuditLogsService,
  ) {}

  @Get()
  @BackofficeToken()
  async listBackofficeAuditLogs(
    @ReqContext() context: IRequestContext,
    @Query(
      new ZodValidationPipe(backofficeListBackofficeAuditLogsDtoQuerySchema),
    )
    query: TBackofficeListBackofficeAuditLogsDtoQuerySchema,
  ) {
    const result = await this.listBackofficeAuditLogsService.execute(
      query,
      context,
    );

    if (result.error) {
      if (result.error instanceof AbstractApplicationException) {
        result.error.context = context;
      }

      throw result.error;
    }

    return result.getValue();
  }
}
