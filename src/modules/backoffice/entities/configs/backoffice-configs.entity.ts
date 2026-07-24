import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@/@shared/entities/base.entity';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';

@Entity('backoffice_configs')
export class BackofficeConfigsEntity extends BaseEntity implements IBackofficeConfigsModel {
  @Column({ default: false, name: 'debug_logging' })
  debugLogging: boolean;
}
