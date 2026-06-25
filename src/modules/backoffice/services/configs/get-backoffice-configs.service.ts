import { Injectable } from '@nestjs/common';
import { Result } from '@/@shared/classes/result';
import { AbstractService } from '@/@shared/classes/service';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';
import { TBackofficeConfigsService } from './backoffice-configs.service';

export abstract class TGetBackofficeConfigsService extends AbstractService<
  void,
  IBackofficeConfigsModel
> {}

@Injectable()
export class GetBackofficeConfigsService implements TGetBackofficeConfigsService {
  constructor(
    private readonly backofficeConfigsService: TBackofficeConfigsService,
    public logger: ILogger,
  ) {
    this.logger.setContextName(GetBackofficeConfigsService.name);
  }

  async execute(): Promise<Result<IBackofficeConfigsModel>> {
    return await this.backofficeConfigsService.getConfigs();
  }
}
