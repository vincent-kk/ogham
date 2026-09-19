import { z } from 'zod';

import { FACTS_SCHEMA_VERSION } from '../../../constants/facts.js';

import { FileFactsSchema } from './fileFactsSchema.js';

/**
 * One record file on disk: a file's facts plus the epoch they were accepted at.
 *
 * The epoch travels with the record because resolution validity is judged
 * against it (spec §2.2): a record whose epoch differs from the project's
 * current one is syntactically valid and resolution-stale, which is a different
 * file state from having no record at all.
 */
export const StoredFactsRecordSchema = z
  .object({
    schemaVersion: z.literal(FACTS_SCHEMA_VERSION),
    resolutionEpoch: z.string().min(1),
    /**
     * How many of the submission's references and exported names filid refused.
     *
     * Server-owned, and kept because a file whose claims were partly rejected is
     * `uncertain` (spec §3) long after the submit call that rejected them has
     * returned — without it, a narrowed record would read as a complete one.
     */
    rejectedClaims: z.number().int().nonnegative(),
    facts: FileFactsSchema,
  })
  .strict();

/** One accepted facts record as it is stored and read back. */
export type StoredFactsRecord = z.infer<typeof StoredFactsRecordSchema>;
