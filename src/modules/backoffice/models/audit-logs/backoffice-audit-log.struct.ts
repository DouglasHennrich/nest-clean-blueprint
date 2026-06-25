export interface IBackofficeAuditLogModel {
  id: string;
  createdAt?: Date;

  // Request Context
  method: string; // GET, POST, PUT, PATCH, DELETE
  path: string; // /api/foods/:id
  endpoint: string; // Identificador amigável: 'CREATE_FOOD', 'UPDATE_PATIENT'

  // User Context
  userId?: string;
  userEmail?: string;
  userName?: string;
  userType?: 'PROFESSIONAL' | 'SECRETARY' | 'RESPONSABLE'; // Tipo do usuário

  // Professional Context (se aplicável)
  professionalId?: string;
  professionalType?: string; // NUTRITIONIST, OCCUPATIONAL_THERAPIST, etc.

  // Entity Context
  entityType?: string; // FOOD, PATIENT, PROFESSIONAL, ORDER, etc.
  entityId?: string; // ID da entidade afetada
  action?: string; // CREATE, UPDATE, DELETE, VIEW, LIST, EXPORT, etc.

  // Request Data
  body?: string; // JSON string (sanitizado - sem senhas)
  params?: string; // JSON string
  query?: string; // JSON string
  headers?: string; // JSON string (sanitizado)
  files?: string; // JSON string com metadados

  // Response Info
  statusCode?: number;
  responseTime?: number; // em ms
  responseSize?: number; // tamanho da resposta em bytes

  // Network Info
  ip?: string;
  userAgent?: string;

  // Data Changes (para UPDATE/DELETE)
  previousData?: string; // JSON string dos dados anteriores
  newData?: string; // JSON string dos novos dados
  changedFields?: string; // JSON array de campos alterados

  // Additional Context
  description?: string; // Descrição legível da ação
  metadata?: string; // JSON string com metadados adicionais

  // Error Tracking
  errorMessage?: string;
  stackTrace?: string;

  // Business Context (opcional)
  careAssignmentId?: string; // Se a ação está relacionada a um care assignment
  patientId?: string; // Se a ação está relacionada a um paciente
}
