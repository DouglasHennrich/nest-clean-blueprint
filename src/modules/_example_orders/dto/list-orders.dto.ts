import { z } from 'zod';
import { OrderStatusEnum } from '../enums/order-status.enum';

export const listOrdersDtoSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(OrderStatusEnum).optional(),
});

export type TListOrdersDto = z.infer<typeof listOrdersDtoSchema>;
