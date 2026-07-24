import { Injectable } from '@nestjs/common';
import { Result } from '@/@shared/classes/result';
import { AbstractService } from '@/@shared/classes/service';
import { ILogger } from '@/@shared/classes/custom-logger';
import {
  updateBackofficeConfigsDtoServiceSchema,
  TUpdateBackofficeConfigsDtoServiceSchema,
} from '../../dto/configs/update-backoffice-configs.dto';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';
import { TBackofficeConfigsService } from './backoffice-configs.service';

export abstract class TUpdateBackofficeConfigsService extends AbstractService<
  TUpdateBackofficeConfigsDtoServiceSchema,
  IBackofficeConfigsModel
> {}

@Injectable()
export class UpdateBackofficeConfigsService implements TUpdateBackofficeConfigsService {
  constructor(
    private readonly backofficeConfigsService: TBackofficeConfigsService,
    public logger: ILogger,
  ) {
    this.logger.setContextName(UpdateBackofficeConfigsService.name);
  }

  async execute(
    serviceDto: TUpdateBackofficeConfigsDtoServiceSchema,
  ): Promise<Result<IBackofficeConfigsModel>> {
    const validateDtoResult = this.validateDto(serviceDto);

    if (validateDtoResult.error) {
      return Result.fail(validateDtoResult.error);
    }

    const validatedDto = validateDtoResult.getValue()!;

    this.logger.debug(`Updating backoffice configs: ${JSON.stringify(validatedDto)}`);

    const updateResult = await this.backofficeConfigsService.updateConfigs(validatedDto);

    if (updateResult.error) {
      return updateResult;
    }

    return updateResult;
  }

  validateDto(
    serviceDto: TUpdateBackofficeConfigsDtoServiceSchema,
  ): Result<TUpdateBackofficeConfigsDtoServiceSchema> {
    try {
      const validatedDto = updateBackofficeConfigsDtoServiceSchema.parse(serviceDto);

      return Result.success(validatedDto);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
