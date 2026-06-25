export interface IBackofficeRequestLogModel {
  id: string;
  createdAt?: Date;

  // Request info
  method: string; // POST, PUT, PATCH, DELETE
  path: string; // /api/orders/:id

  // User info
  userId?: string;
  userEmail?: string;
  userName?: string;
  userType?: string;

  // Request data
  body?: string; // JSON string
  params?: string; // JSON string
  query?: string; // JSON string
  headers?: string; // JSON string (sanitized - sem tokens/passwords)
  files?: string; // JSON string com metadados dos arquivos
  file?: string; // JSON string com metadados do arquivo único

  // Response info
  statusCode?: number;
  responseTime?: number; // em ms

  // Network info
  ip?: string;
  userAgent?: string;

  // Additional info
  errorMessage?: string;
  stackTrace?: string;

  // Correlation & enrichment
  requestId?: string;
  responseBody?: string;
  entityIds?: string;
}
