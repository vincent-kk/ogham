import { z } from 'zod';

import {
  FACTS_HASH_PREFIX,
  FACTS_SCHEMA_VERSION,
} from '../../../constants/facts.js';
import { FileFactsSchema } from '../schema/fileFactsSchema.js';

/**
 * One file's unconfirmed attested submission.
 *
 * Stored apart from the record shards on purpose: a pending attestation is not
 * yet a fact, and mixing the two would blur what "a syntactically valid record"
 * means for every rule that reads the store. The edges a confirmation is
 * compared against are derived from `facts` rather than stored beside it — two
 * copies of the same set drift, and the one that drifts is the one nothing
 * checks.
 */
export const PendingAttestationSchema = z
  .object({
    schemaVersion: z.literal(FACTS_SCHEMA_VERSION),
    path: z.string().min(1),
    /** Self-declared actor of the first submission; the server cannot verify it. */
    actor: z.string().min(1),
    /** The bytes that submission read; a confirmation must read the same ones. */
    contentHash: z
      .string()
      .regex(new RegExp(`^${FACTS_HASH_PREFIX}[0-9a-f]{64}$`)),
    /** The record that becomes the file's record once a second actor agrees. */
    facts: FileFactsSchema,
  })
  .strict();

/** One file's stored pending attestation. */
export type PendingAttestation = z.infer<typeof PendingAttestationSchema>;
