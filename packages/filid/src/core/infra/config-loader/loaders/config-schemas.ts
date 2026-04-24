import { z } from 'zod';

/**
 * Single RuleOverride entry schema. Strict — unknown keys are surfaced as
 * zod issues so `loadConfig` can warn + physically drop them (never
 * pass-through).
 */
export const RuleOverrideSchema = z
  .object({
    enabled: z.boolean().optional(),
    severity: z.enum(['error', 'warning', 'info']).optional(),
    exempt: z.array(z.string()).optional(),
  })
  .strict();

/**
 * Entry accepted inside the top-level `additional-allowed` array.
 * Either a bare basename string (applied globally) or an object restricting
 * the basename to specific path globs. Consumed by the `zero-peer-file` rule.
 */
export const AllowedEntrySchema = z.union([
  z.string(),
  z
    .object({
      basename: z.string(),
      paths: z.array(z.string()).optional(),
    })
    .strict(),
]);

/** Allowed-entry union type derived from `AllowedEntrySchema`. */
export type AllowedEntry = z.infer<typeof AllowedEntrySchema>;

/**
 * Top-level `.filid/config.json` schema. `FilidConfig` is derived via
 * `z.infer` — this schema is the single source of truth for the type shape.
 * `.strict()` ensures unknown keys are reported by zod issues.
 */
export const FilidConfigSchema = z
  .object({
    version: z.string(),
    rules: z.record(z.string(), RuleOverrideSchema),
    language: z.string().optional(),
    'additional-allowed': z.array(AllowedEntrySchema).optional(),
    scan: z
      .object({
        maxDepth: z.number().nonnegative().finite().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/** Schema of .filid/config.json (derived from FilidConfigSchema via zod). */
export type FilidConfig = z.infer<typeof FilidConfigSchema>;
