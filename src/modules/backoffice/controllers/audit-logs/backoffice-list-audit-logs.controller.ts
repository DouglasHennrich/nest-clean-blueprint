import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import {
  backofficeListBackofficeAuditLogsDtoQuerySchema,
  TBackofficeListBackofficeAuditLogsDtoQuerySchema,
} from '../../dto/audit-logs/backoffice-list-audit-logs.dto';
import { TBackofficeListBackofficeAuditLogsService } from '../../services/audit-logs/backoffice-list-audit-logs.service';
import { BackofficeToken } from '../../decorators/backoffice.decorator';
import { BackofficeGuard } from '../../guards/backoffice.guard';
import { IBackofficeAuditLogPresenter } from '../../presenters/audit-logs/backoffice-audit-log.presenter';

@Controller('backoffice/audit-logs')
@UseGuards(BackofficeGuard)
export class BackofficeListBackofficeAuditLogsController {
  constructor(
    private listBackofficeAuditLogsService: TBackofficeListBackofficeAuditLogsService,
    private auditLogPresenter: IBackofficeAuditLogPresenter,
  ) {}

  @Get()
  @BackofficeToken()
  async listBackofficeAuditLogs(
    @Query(new ZodValidationPipe(backofficeListBackofficeAuditLogsDtoQuerySchema))
    query: TBackofficeListBackofficeAuditLogsDtoQuerySchema,
  ) {
    const result = await this.listBackofficeAuditLogsService.execute(query);

    if (result.error) {
      throw result.error;
    }

    const page = result.getValue()!;

    return {
      data: this.auditLogPresenter.presentMany({ entities: page.data }),
      hasNextPage: page.hasNextPage,
      total: page.total,
    };
  }
}
