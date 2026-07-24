import { z } from 'zod';

export const deleteOrderDtoSchema = z.object({
  id: z.string().uuid(),
});

export type TDeleteOrderDto = z.infer<typeof deleteOrderDtoSchema>;
