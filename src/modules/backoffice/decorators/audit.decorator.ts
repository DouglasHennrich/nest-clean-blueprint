import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit';

export interface IAuditMetadataModel {
  action: string; // CREATE, UPDATE, DELETE, READ
  entityType?: string; // FOOD, PATIENT, CARE_ASSIGNMENT, etc
  endpoint: string; // Friendly name: 'CREATE_FOOD', 'UPDATE_PATIENT'
  description?: string;
}

export const Audit = (metadata: IAuditMetadataModel) => SetMetadata(AUDIT_METADATA_KEY, metadata);
