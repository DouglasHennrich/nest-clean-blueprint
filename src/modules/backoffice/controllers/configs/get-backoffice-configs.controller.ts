import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';

import { TGetBackofficeConfigsService } from '../../services/configs/get-backoffice-configs.service';
import { BackofficeToken } from '../../decorators/backoffice.decorator';
import { BackofficeGuard } from '../../guards/backoffice.guard';
import { IBackofficeConfigsPresenter } from '../../presenters/configs/backoffice-configs.presenter';

@Controller('backoffice/configs')
@UseGuards(BackofficeGuard)
export class GetBackofficeConfigsController {
  constructor(
    private getService: TGetBackofficeConfigsService,
    private configsPresenter: IBackofficeConfigsPresenter,
  ) {}

  @BackofficeToken()
  @Get()
  @HttpCode(HttpStatus.OK)
  async getConfigs() {
    const result = await this.getService.execute();

    if (result.error) {
      throw result.error;
    }

    return this.configsPresenter.present({ entity: result.getValue()! });
  }
}
