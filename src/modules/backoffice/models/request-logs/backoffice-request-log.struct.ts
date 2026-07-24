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
  headers?: string; // JSON string (sanitized - no tokens/passwords)
  files?: string; // JSON string with file metadata
  file?: string; // JSON string with single-file metadata

  // Response info
  statusCode?: number;
  responseTime?: number; // in ms

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
