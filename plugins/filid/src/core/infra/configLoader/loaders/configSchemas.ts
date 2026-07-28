import { z } from 'zod';

export const RuleOverrideSchema = z
  .object({
    enabled: z.boolean().optional(),
    severity: z.enum(['error', 'warning', 'info']).optional(),
    exempt: z.array(z.string()).optional(),
  })
  .strict();

export const AllowedPeerOverrideSchema = z
  .object({
    basename: z.string().min(1),
    paths: z.array(z.string()).optional(),
    adapterId: z.string().min(1).optional(),
  })
  .strict();

export type AllowedPeerOverride = z.infer<typeof AllowedPeerOverrideSchema>;

const AdapterSelectionSchema = z
  .object({
    mode: z.enum(['auto', 'explicit']),
    enabled: z.array(z.string().min(1)),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.mode === 'explicit' && value.enabled.length === 0)
      context.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: 'array',
        inclusive: true,
        path: ['enabled'],
        message: 'explicit adapter mode requires at least one enabled ID',
      });
  });

const StructureConfigSchema = z
  .object({
    maxDepth: z.number().nonnegative().finite().optional(),
    additionalOrganNames: z.array(z.string().min(1)).optional(),
    additionalAllowedPeers: z.array(AllowedPeerOverrideSchema).optional(),
    entryPointOverrides: z
      .record(z.string(), z.array(z.string().min(1)))
      .optional(),
  })
  .strict();

export const FilidConfigSchema = z
  .object({
    version: z.literal('2.0'),
    language: z.string().optional(),
    adapters: AdapterSelectionSchema,
    rules: z.record(z.string(), RuleOverrideSchema),
    structure: StructureConfigSchema.optional(),
  })
  .strict();

export type FilidConfig = z.infer<typeof FilidConfigSchema>;
