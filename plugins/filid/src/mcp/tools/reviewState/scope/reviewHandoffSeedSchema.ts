import { z } from 'zod';

import {
  REVIEW_HANDOFF_CLASSES,
  REVIEW_HANDOFF_DOCUMENT_SYNC_STATES,
  REVIEW_HANDOFF_HASH_LIMIT,
  REVIEW_HANDOFF_MAX_ENTRIES,
  REVIEW_HANDOFF_NOTE_LIMIT,
  REVIEW_HANDOFF_PATH_LIMIT,
  REVIEW_HANDOFF_RULE_ID_LIMIT,
  REVIEW_HANDOFF_SCHEMA_VERSION,
  REVIEW_HANDOFF_SCOPE_LIMIT,
} from '../../../../constants/reviewState.js';

/** Strict bounded claim recorded by the Stage 1 handoff writer. */
const REVIEW_HANDOFF_ENTRY_SCHEMA = z
  .object({
    class: z.enum(REVIEW_HANDOFF_CLASSES),
    ruleId: z.string().min(1).max(REVIEW_HANDOFF_RULE_ID_LIMIT),
    path: z.string().min(1).max(REVIEW_HANDOFF_PATH_LIMIT),
    severity: z.enum(['error', 'warning', 'info']),
    certainty: z.enum(['exact', 'indeterminate', 'unsupported', 'unstated']),
    note: z.string().max(REVIEW_HANDOFF_NOTE_LIMIT),
  })
  .strict();

/** Caller-supplied handoff claim whose omitted judgment fields receive defaults. */
export const REVIEW_HANDOFF_CALLER_ENTRY_SCHEMA = z
  .object({
    class: z.enum(REVIEW_HANDOFF_CLASSES),
    ruleId: z.string().min(1),
    path: z.string().min(1),
    severity: z.enum(['error', 'warning', 'info']).optional(),
    certainty: z
      .enum(['exact', 'indeterminate', 'unsupported', 'unstated'])
      .optional(),
    note: z.string().min(1),
  })
  .strict();

/** Canonical schema for untrusted Stage 1 handoff claims carried in change context. */
export const REVIEW_HANDOFF_SEED_SCHEMA = z
  .object({
    schema: z.literal(REVIEW_HANDOFF_SCHEMA_VERSION),
    snapshotHash: z.string().min(1).max(REVIEW_HANDOFF_HASH_LIMIT).nullable(),
    scope: z
      .array(z.string().min(1).max(REVIEW_HANDOFF_PATH_LIMIT))
      .max(REVIEW_HANDOFF_SCOPE_LIMIT),
    documentSync: z.enum(REVIEW_HANDOFF_DOCUMENT_SYNC_STATES),
    repaired: z.number().int().nonnegative(),
    recorded: z
      .array(REVIEW_HANDOFF_ENTRY_SCHEMA)
      .max(REVIEW_HANDOFF_MAX_ENTRIES),
    truncated: z.number().int().nonnegative(),
  })
  .strict();

/** Validated handoff payload passed to briefs without persisting it in review state. */
export type ReviewHandoffSeed = z.infer<typeof REVIEW_HANDOFF_SEED_SCHEMA>;

/** One untrusted claim that a reviewer must confirm against independent evidence. */
export type ReviewHandoffEntry = z.infer<typeof REVIEW_HANDOFF_ENTRY_SCHEMA>;
