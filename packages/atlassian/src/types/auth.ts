import { z } from 'zod';

export const TokenPayloadSchema = z.object({
  type: z.enum(['basic', 'bearer']),
  value: z.string(),
});
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
