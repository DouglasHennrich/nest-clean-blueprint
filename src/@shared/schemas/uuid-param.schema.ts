import z from 'zod';

export const uuidParamSchema = z.object({
  id: z.uuid(),
});

export type TUuidParam = z.infer<typeof uuidParamSchema>;
