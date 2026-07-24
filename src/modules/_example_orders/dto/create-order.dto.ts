import { z } from 'zod';

export const createOrderDtoSchema = z.object({
  customerName: z.string().min(1).max(255),
  amount: z.number().positive(),
});

export type TCreateOrderDto = z.infer<typeof createOrderDtoSchema>;
