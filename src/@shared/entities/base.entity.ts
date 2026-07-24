import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * BaseEntity
 *
 * Abstract base for every TypeORM entity in the project. Provides a UUID
 * primary key plus created/updated/soft-delete timestamps with snake_case
 * database column names, matching this repo's existing entity conventions.
 *
 * Extend this class instead of redeclaring these columns on every entity.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;
}
