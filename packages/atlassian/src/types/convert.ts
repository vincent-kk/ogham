import { z } from 'zod';

export const ConvertFormatSchema = z.enum(['markdown', 'adf', 'storage', 'wiki']);
export type ConvertFormat = z.infer<typeof ConvertFormatSchema>;

export const ConvertDirectionSchema = z.object({
  from: ConvertFormatSchema,
  to: ConvertFormatSchema,
  content: z.string(),
});
export type ConvertDirection = z.infer<typeof ConvertDirectionSchema>;
