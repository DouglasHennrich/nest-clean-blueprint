import { z } from 'zod';
import { OrderStatusEnum } from '../enums/order-status.enum';

export const updateOrderParamDtoSchema = z.object({
  id: z.string().uuid(),
});

export type TUpdateOrderParamDto = z.infer<typeof updateOrderParamDtoSchema>;

export const updateOrderDtoSchema = z.object({
  customerName: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  status: z.nativeEnum(OrderStatusEnum).optional(),
});

export type TUpdateOrderDto = z.infer<typeof updateOrderDtoSchema>;

// Service-only variant: the controller merges the route param `id` into the
// body before calling the service, so the service validates against the
// extended shape (id is not part of the request body schema above).
export const updateOrderServiceDtoSchema = updateOrderDtoSchema.extend({
  id: z.string().uuid(),
});

export type TUpdateOrderServiceDto = z.infer<typeof updateOrderServiceDtoSchema>;
