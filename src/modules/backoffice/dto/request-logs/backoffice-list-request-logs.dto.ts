import { z } from 'zod';

export const backofficeListRequestLogsDtoQuerySchema = z.object({
  // Filtros específicos
  userId: z.string().uuid().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  statusCode: z
    .union([z.string().transform((val) => parseInt(val, 10)), z.number()])
    .pipe(z.number().int().min(100).max(599))
    .optional(),
  startDate: z
    .union([z.string().transform((val) => new Date(val)), z.date()])
    .optional(),
  endDate: z
    .union([z.string().transform((val) => new Date(val)), z.date()])
    .optional(),

  // Paginação
  page: z
    .union([z.string().transform((val) => parseInt(val, 10)), z.number()])
    .pipe(z.number().int().min(1))
    .optional(),
  offset: z
    .union([z.string().transform((val) => parseInt(val, 10)), z.number()])
    .pipe(z.number().int().min(1))
    .optional(),
});

export const backofficeListRequestLogsDtoServiceSchema =
  backofficeListRequestLogsDtoQuerySchema.extend({});

export type TBackofficeListRequestLogsDtoQuerySchema = z.infer<
  typeof backofficeListRequestLogsDtoQuerySchema
>;
export type TBackofficeListRequestLogsDtoServiceSchema = z.infer<
  typeof backofficeListRequestLogsDtoServiceSchema
>;
