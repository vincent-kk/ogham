import { z } from 'zod/v4';

export const VaultConfigSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  layers: z.array(z.number().int().min(1).max(5)).default([2, 3, 4, 5]),
  default: z.boolean().optional().default(false),
});

export const LensConfigSchema = z.object({
  version: z.string().default('1.0'),
  vaults: z.array(VaultConfigSchema).min(1),
});

export type VaultConfig = z.infer<typeof VaultConfigSchema>;
export type LensConfig = z.infer<typeof LensConfigSchema>;
