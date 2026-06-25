import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';

@Entity('backoffice_configs')
export class BackofficeConfigsEntity implements IBackofficeConfigsModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ default: false, name: 'debug_logging' })
  debugLogging: boolean;
}
