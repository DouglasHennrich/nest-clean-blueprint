export interface IBackofficeAuditLogModel {
  id: string;
  createdAt?: Date;

  // Request Context
  method: string; // GET, POST, PUT, PATCH, DELETE
  path: string; // /api/foods/:id
  endpoint: string; // Friendly identifier: 'CREATE_FOOD', 'UPDATE_PATIENT'

  // User Context
  userId?: string;
  userEmail?: string;
  userName?: string;
  userType?: 'PROFESSIONAL' | 'SECRETARY' | 'RESPONSABLE'; // User type

  // Professional Context (if applicable)
  professionalId?: string;
  professionalType?: string; // NUTRITIONIST, OCCUPATIONAL_THERAPIST, etc.

  // Entity Context
  entityType?: string; // FOOD, PATIENT, PROFESSIONAL, ORDER, etc.
  entityId?: string; // ID of the affected entity
  action?: string; // CREATE, UPDATE, DELETE, VIEW, LIST, EXPORT, etc.

  // Request Data
  body?: string; // JSON string (sanitized - no passwords)
  params?: string; // JSON string
  query?: string; // JSON string
  headers?: string; // JSON string (sanitized)
  files?: string; // JSON string with metadata

  // Response Info
  statusCode?: number;
  responseTime?: number; // in ms
  responseSize?: number; // response size in bytes

  // Network Info
  ip?: string;
  userAgent?: string;

  // Data Changes (for UPDATE/DELETE)
  previousData?: string; // JSON string of the previous data
  newData?: string; // JSON string of the new data
  changedFields?: string; // JSON array of changed fields

  // Additional Context
  description?: string; // Human-readable description of the action
  metadata?: string; // JSON string with additional metadata

  // Error Tracking
  errorMessage?: string;
  stackTrace?: string;

  // Business Context (optional)
  careAssignmentId?: string; // If the action is related to a care assignment
  patientId?: string; // If the action is related to a patient
}
