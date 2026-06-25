import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit';

export interface IAuditMetadata {
  action: string; // CREATE, UPDATE, DELETE, READ
  entityType?: string; // FOOD, PATIENT, CARE_ASSIGNMENT, etc
  endpoint: string; // Nome amigável: 'CREATE_FOOD', 'UPDATE_PATIENT'
  description?: string;
}

export const Audit = (metadata: IAuditMetadata) =>
  SetMetadata(AUDIT_METADATA_KEY, metadata);
