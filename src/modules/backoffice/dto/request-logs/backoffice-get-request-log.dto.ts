import { z } from 'zod';

export const backofficeGetRequestLogDtoParamSchema = z.object({
  id: z.string().uuid(),
});

export const backofficeGetRequestLogDtoServiceSchema = backofficeGetRequestLogDtoParamSchema.extend(
  {},
);

export type TBackofficeGetRequestLogDtoParamSchema = z.infer<
  typeof backofficeGetRequestLogDtoParamSchema
>;
export type TBackofficeGetRequestLogDtoServiceSchema = z.infer<
  typeof backofficeGetRequestLogDtoServiceSchema
>;
