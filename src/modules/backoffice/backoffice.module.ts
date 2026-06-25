import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackofficeConfigsEntity } from './entities/configs/backoffice-configs.entity';
import {
  UpdateBackofficeConfigsService,
  TUpdateBackofficeConfigsService,
} from './services/configs/update-backoffice-configs.service';
import {
  GetBackofficeConfigsService,
  TGetBackofficeConfigsService,
} from './services/configs/get-backoffice-configs.service';
import {
  IBackofficeConfigsRepository,
  BackofficeConfigsRepository,
} from './repositories/configs/backoffice-configs.repository';
import { UpdateBackofficeConfigsController } from './controllers/configs/update-backoffice-configs.controller';
import { GetBackofficeConfigsController } from './controllers/configs/get-backoffice-configs.controller';

import { UploadProviderModule } from '@/@shared/providers/upload-provider/upload-provider.module';

import {
  TBackofficeConfigsService,
  BackofficeConfigsService,
} from './services/configs/backoffice-configs.service';
import { BackofficeRequestLogEntity } from './entities/request-logs/backoffice-request-log.entity';
import {
  IBackofficeRequestLogsRepository,
  BackofficeRequestLogsRepository,
} from './repositories/request-logs/backoffice-request-logs.repository';
import {
  TBackofficeCreateRequestLogService,
  BackofficeCreateRequestLogService,
} from './services/request-logs/backoffice-create-request-log.service';
import {
  TBackofficeGetRequestLogService,
  BackofficeGetRequestLogService,
} from './services/request-logs/backoffice-get-request-log.service';
import {
  TBackofficeListRequestLogsService,
  BackofficeListRequestLogsService,
} from './services/request-logs/backoffice-list-request-logs.service';
import { BackofficeAuditLogEntity } from '@/modules/backoffice/entities/audit-logs/backoffice-audit-log.entity';
import {
  IBackofficeAuditLogsRepository,
  BackofficeAuditLogsRepository,
} from './repositories/audit-logs/audit-logs.repository';
import {
  TBackofficeCreateBackofficeAuditLogService,
  BackofficeCreateBackofficeAuditLogService,
} from './services/audit-logs/backoffice-create-audit-log.service';
import {
  TBackofficeListBackofficeAuditLogsService,
  BackofficeListBackofficeAuditLogsService,
} from './services/audit-logs/backoffice-list-audit-logs.service';
import { BackofficeListBackofficeAuditLogsController } from './controllers/audit-logs/backoffice-list-audit-logs.controller';
import { QueuesModule } from '../queues/queues.module';
import {
  TBackofficeFlushRequestLogQueueService,
  BackofficeFlushRequestLogQueueService,
} from './services/request-logs/backoffice-flush-request-log-queue.service';
import { BackofficeFlushRequestLogQueueController } from './controllers/request-logs/backoffice-flush-request-log-queue.controller';
import { BackofficeGetRequestLogController } from './controllers/request-logs/backoffice-get-request-log.controller';
import { BackofficeListRequestLogsController } from './controllers/request-logs/backoffice-list-request-logs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BackofficeConfigsEntity,
      BackofficeRequestLogEntity,
      BackofficeAuditLogEntity,
    ]),
    UploadProviderModule,
    forwardRef(() => QueuesModule),
  ],
  controllers: [
    /// //////////////////////////
    //  Configs
    /// //////////////////////////
    GetBackofficeConfigsController,
    UpdateBackofficeConfigsController,

    /// //////////////////////////
    //  Request Logs
    /// //////////////////////////
    BackofficeFlushRequestLogQueueController,
    BackofficeListRequestLogsController,
    BackofficeGetRequestLogController,

    /// //////////////////////////
    //  Audit Logs
    /// //////////////////////////
    BackofficeListBackofficeAuditLogsController,
  ],
  providers: [
    // ================================================
    // Repositories
    // ================================================
    /// //////////////////////////
    //  Configs
    /// //////////////////////////
    {
      provide: IBackofficeConfigsRepository,
      useClass: BackofficeConfigsRepository,
    },

    /// //////////////////////////
    //  Request Logs
    /// //////////////////////////
    {
      provide: IBackofficeRequestLogsRepository,
      useClass: BackofficeRequestLogsRepository,
    },

    //////////////////////////
    //  Audit Logs
    /// //////////////////////////
    {
      provide: IBackofficeAuditLogsRepository,
      useClass: BackofficeAuditLogsRepository,
    },

    // ================================================
    // Services
    // ================================================
    /// //////////////////////////
    //  Configs
    /// //////////////////////////
    {
      provide: TBackofficeConfigsService,
      useClass: BackofficeConfigsService,
    },
    {
      provide: TUpdateBackofficeConfigsService,
      useClass: UpdateBackofficeConfigsService,
    },
    {
      provide: TGetBackofficeConfigsService,
      useClass: GetBackofficeConfigsService,
    },

    /// //////////////////////////
    //  Request Logs
    /// //////////////////////////
    {
      provide: TBackofficeCreateRequestLogService,
      useClass: BackofficeCreateRequestLogService,
    },
    {
      provide: TBackofficeFlushRequestLogQueueService,
      useClass: BackofficeFlushRequestLogQueueService,
    },
    {
      provide: TBackofficeListRequestLogsService,
      useClass: BackofficeListRequestLogsService,
    },
    {
      provide: TBackofficeGetRequestLogService,
      useClass: BackofficeGetRequestLogService,
    },

    /// //////////////////////////
    //  Audit Logs
    /// //////////////////////////
    {
      provide: TBackofficeCreateBackofficeAuditLogService,
      useClass: BackofficeCreateBackofficeAuditLogService,
    },
    {
      provide: TBackofficeListBackofficeAuditLogsService,
      useClass: BackofficeListBackofficeAuditLogsService,
    },
  ],
  exports: [
    IBackofficeConfigsRepository,
    TUpdateBackofficeConfigsService,
    IBackofficeRequestLogsRepository,
    IBackofficeAuditLogsRepository,
    TBackofficeCreateRequestLogService,
    TBackofficeCreateBackofficeAuditLogService,
  ],
})
export class BackofficeModule {}
