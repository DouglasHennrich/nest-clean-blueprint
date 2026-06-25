import { z } from 'zod';

export const backofficeCreateRequestLogDtoServiceSchema = z.any();

export type TBackofficeCreateRequestLogDtoServiceSchema = z.infer<
  typeof backofficeCreateRequestLogDtoServiceSchema
>;
