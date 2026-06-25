import { Injectable } from '@nestjs/common';
import { AbstractRepository } from '@/@shared/classes/repository';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TEnvService } from '@/modules/env/services/env.service';
import { CustomLogger } from '@/@shared/classes/custom-logger';
import { BackofficeConfigsEntity } from '../../entities/configs/backoffice-configs.entity';

export class IBackofficeConfigsRepository extends AbstractRepository<
  BackofficeConfigsEntity,
  IBackofficeConfigsModel
> {}

@Injectable()
export class BackofficeConfigsRepository extends IBackofficeConfigsRepository {
  constructor(
    @InjectRepository(BackofficeConfigsEntity)
    readonly backofficeConfigsRepository: Repository<BackofficeConfigsEntity>,
    readonly envService: TEnvService,
  ) {
    super(
      backofficeConfigsRepository,
      envService,
      new CustomLogger(envService, BackofficeConfigsRepository.name),
    );
  }
}
