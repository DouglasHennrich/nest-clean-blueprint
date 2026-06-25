import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IBackofficeAuditLogModel } from '@/modules/backoffice/models/audit-logs/backoffice-audit-log.struct';

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['professionalId', 'createdAt'])
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['careAssignmentId', 'createdAt'])
@Index(['patientId', 'createdAt'])
@Index(['path', 'method', 'createdAt'])
export class BackofficeAuditLogEntity implements IBackofficeAuditLogModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  // Request Context
  @Column({ type: 'text' })
  method: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'text' })
  endpoint: string;

  // User Context
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'user_email', type: 'text', nullable: true })
  userEmail?: string;

  @Column({ name: 'user_name', type: 'text', nullable: true })
  userName?: string;

  @Column({ name: 'user_type', type: 'text', nullable: true })
  userType?: 'PROFESSIONAL' | 'SECRETARY' | 'RESPONSABLE';

  // Professional Context
  @Column({ name: 'professional_id', type: 'uuid', nullable: true })
  professionalId?: string;

  @Column({
    name: 'professional_type',
    type: 'text',
    nullable: true,
  })
  professionalType?: string;

  // Entity Context
  @Column({ name: 'entity_type', type: 'text', nullable: true })
  entityType?: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ type: 'text', nullable: true })
  action?: string;

  // Request Data
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

  // Response Info
  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode?: number;

  @Column({ name: 'response_time', type: 'int', nullable: true })
  responseTime?: number;

  @Column({ name: 'response_size', type: 'int', nullable: true })
  responseSize?: number;

  // Network Info
  @Column({ type: 'text', nullable: true })
  ip?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  // Data Changes
  @Column({ name: 'previous_data', type: 'text', nullable: true })
  previousData?: string;

  @Column({ name: 'new_data', type: 'text', nullable: true })
  newData?: string;

  @Column({ name: 'changed_fields', type: 'text', nullable: true })
  changedFields?: string;

  // Additional Context
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  metadata?: string;

  // Error Tracking
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'stack_trace', type: 'text', nullable: true })
  stackTrace?: string;

  // Business Context
  @Column({ name: 'care_assignment_id', type: 'uuid', nullable: true })
  careAssignmentId?: string;

  @Column({ name: 'patient_id', type: 'uuid', nullable: true })
  patientId?: string;
}
