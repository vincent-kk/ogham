import { z } from 'zod';

/** Strict schema for one built-in rule override. */
export const RuleOverrideSchema = z
  .object({
    enabled: z.boolean().optional(),
    severity: z.enum(['error', 'warning', 'info']).optional(),
    exempt: z.array(z.string()).optional(),
  })
  .strict();

/** Strict schema for one allowed peer override. */
export const AllowedPeerOverrideSchema = z
  .object({
    basename: z.string().min(1),
    paths: z.array(z.string()).optional(),
    adapterId: z.string().min(1).optional(),
  })
  .strict();

/** Validated allowed peer override value. */
export type AllowedPeerOverride = z.infer<typeof AllowedPeerOverrideSchema>;

/** Adapter selection policy stored in Filid configuration. */
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

/** Optional project structure overrides stored in Filid configuration. */
const StructureConfigSchema = z
  .object({
    maxDepth: z.number().nonnegative().finite().optional(),
    additionalOrganNames: z.array(z.string().min(1)).optional(),
    additionalAllowedPeers: z.array(AllowedPeerOverrideSchema).optional(),
    additionalExcludedDirectories: z.array(z.string().min(1)).optional(),
    entryPointOverrides: z
      .record(z.string(), z.array(z.string().min(1)))
      .optional(),
    generatedPaths: z.array(z.string().min(1)).optional(),
  })
  .strict();

/** Optional cross-review execution settings stored in Filid configuration. */
const ReviewConfigSchema = z
  .object({
    effort: z.enum(['low', 'medium', 'high']).optional(),
    groupChurnLimit: z.number().int().positive().optional(),
    groupFileLimit: z.number().int().positive().optional(),
    planChurnLimit: z.number().int().positive().optional(),
    concurrency: z.number().int().positive().optional(),
    lockfiles: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .transform((value) => ({
    ...value,
    ...(value.lockfiles
      ? { lockfiles: Array.from(new Set(value.lockfiles)) }
      : {}),
  }));

/** Strict schema for the merged Filid v2 configuration. */
export const FilidConfigSchema = z
  .object({
    version: z.literal('2.0'),
    language: z.string().optional(),
    adapters: AdapterSelectionSchema,
    rules: z.record(z.string(), RuleOverrideSchema),
    structure: StructureConfigSchema.optional(),
    review: ReviewConfigSchema.optional(),
  })
  .strict();

/** Validated Filid v2 configuration value. */
export type FilidConfig = z.infer<typeof FilidConfigSchema>;
