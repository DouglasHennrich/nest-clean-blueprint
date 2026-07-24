import { z } from 'zod';

export const getOrderDtoSchema = z.object({
  id: z.string().uuid(),
});

export type TGetOrderDto = z.infer<typeof getOrderDtoSchema>;
