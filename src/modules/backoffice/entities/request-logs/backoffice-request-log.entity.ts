import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';

@Entity('backoffice_request_logs')
@Index(['userId', 'createdAt'])
@Index(['path', 'createdAt'])
@Index(['statusCode', 'createdAt'])
export class BackofficeRequestLogEntity implements IBackofficeRequestLogModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Request info
  @Column({ type: 'varchar' })
  method: string;

  @Column({ type: 'varchar' })
  path: string;

  // User info
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', name: 'user_email', nullable: true })
  userEmail?: string;

  @Column({ type: 'varchar', name: 'user_name', nullable: true })
  userName?: string;

  @Column({ type: 'varchar', name: 'user_type', nullable: true })
  userType?: string;

  // Request data
  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ type: 'text', nullable: true })
  params?: string;

  @Column({ type: 'text', nullable: true })
  query?: string;

  @Column({ type: 'text', nullable: true })
  headers?: string;

  @Column({ type: 'text', nullable: true })
  files?: string;

  @Column({ type: 'text', nullable: true })
  file?: string;

  // Response info
  @Column({ type: 'int', name: 'status_code', nullable: true })
  statusCode?: number;

  @Column({ type: 'int', name: 'response_time', nullable: true })
  responseTime?: number;

  // Network info
  @Column({ type: 'varchar', nullable: true })
  ip?: string;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent?: string;

  // Additional info
  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column({ type: 'text', name: 'stack_trace', nullable: true })
  stackTrace?: string;

  // Correlation & enrichment
  @Column({ type: 'varchar', name: 'request_id', nullable: true })
  requestId?: string;

  @Column({ type: 'text', name: 'response_body', nullable: true })
  responseBody?: string;

  @Column({ type: 'text', name: 'entity_ids', nullable: true })
  entityIds?: string;
}
