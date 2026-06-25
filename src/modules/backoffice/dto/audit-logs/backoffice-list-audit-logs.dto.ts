import { z } from 'zod';

export const backofficeListBackofficeAuditLogsDtoQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  method: z.string().optional(),
  statusCode: z.coerce.number().int().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  careAssignmentId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  offset: z.coerce.number().int().min(1).optional(),
});

export type TBackofficeListBackofficeAuditLogsDtoQuerySchema = z.infer<
  typeof backofficeListBackofficeAuditLogsDtoQuerySchema
>;
