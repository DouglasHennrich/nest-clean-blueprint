import { Body, Controller, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import {
  TUpdateBackofficeConfigsDtoBodySchema,
  updateBackofficeConfigsDtoBodySchema,
} from '../../dto/configs/update-backoffice-configs.dto';
import { TUpdateBackofficeConfigsService } from '../../services/configs/update-backoffice-configs.service';
import { BackofficeToken } from '../../decorators/backoffice.decorator';
import { BackofficeGuard } from '../../guards/backoffice.guard';
import { IBackofficeConfigsPresenter } from '../../presenters/configs/backoffice-configs.presenter';

@Controller('backoffice/configs')
@UseGuards(BackofficeGuard)
export class UpdateBackofficeConfigsController {
  constructor(
    private updateService: TUpdateBackofficeConfigsService,
    private configsPresenter: IBackofficeConfigsPresenter,
  ) {}

  @BackofficeToken()
  @Put()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Body(new ZodValidationPipe(updateBackofficeConfigsDtoBodySchema))
    body: TUpdateBackofficeConfigsDtoBodySchema,
  ) {
    const result = await this.updateService.execute({
      ...body,
    });

    if (result.error) {
      throw result.error;
    }

    return this.configsPresenter.present({ entity: result.getValue()! });
  }
}
