import { z } from 'zod';
import { stringToBooleanSchema } from '@/@shared/schemas/transforms.schema';

export const updateBackofficeConfigsDtoBodySchema = z.object({
  debugLogging: stringToBooleanSchema.optional(),
});

export const updateBackofficeConfigsDtoServiceSchema = updateBackofficeConfigsDtoBodySchema;

export type TUpdateBackofficeConfigsDtoBodySchema = z.infer<
  typeof updateBackofficeConfigsDtoBodySchema
>;

export type TUpdateBackofficeConfigsDtoServiceSchema = z.infer<
  typeof updateBackofficeConfigsDtoServiceSchema
>;
