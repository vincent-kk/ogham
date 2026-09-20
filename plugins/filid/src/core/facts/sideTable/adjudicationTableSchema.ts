import { z } from 'zod';

import {
  FACTS_ADJUDICATION_ORIGINS,
  FACTS_ADJUDICATION_STATES,
  FACTS_HASH_PREFIX,
  FACTS_REFERENCE_KINDS,
  FACTS_SCHEMA_VERSION,
} from '../../../constants/facts.js';

/** A `sha256:<hex>` digest as the table spells it. */
const DigestSchema = z
  .string()
  .regex(new RegExp(`^${FACTS_HASH_PREFIX}[0-9a-f]{64}$`));

/** One adjudication item, strictly as stored. */
const AdjudicationItemSchema = z
  .object({
    path: z.string().min(1),
    kind: z.nativeEnum(FACTS_REFERENCE_KINDS),
    reference: z.string().min(1),
    resolvedPath: z.string().min(1),
    origin: z.nativeEnum(FACTS_ADJUDICATION_ORIGINS),
    state: z.nativeEnum(FACTS_ADJUDICATION_STATES),
    lineDigest: DigestSchema,
    contentHash: DigestSchema,
    actor: z.string().min(1).optional(),
    reason: z.string().min(1).optional(),
  })
  .strict();

/**
 * One file's page of the side table.
 *
 * Per file because that is the unit a judgement is about and the unit a reader
 * opens: an agent adjudicating reads the lines of one file. It is stored apart
 * from the facts record on purpose — a submission replaces records, and the
 * whole point of the table is that a replacement cannot quietly erase an edge
 * somebody reported (spec §2.4).
 */
export const AdjudicationPageSchema = z
  .object({
    schemaVersion: z.literal(FACTS_SCHEMA_VERSION),
    path: z.string().min(1),
    items: z.array(AdjudicationItemSchema),
    /**
     * Set when this file's judgements were discarded as unreadable.
     *
     * The discard removed whatever the shard held, including an adopted edge no
     * record carries, so the file stays uncertain until a comparison from a
     * different provenance re-derives it (spec §3). Only `true` is stored:
     * absent is the ordinary state, and a stored `false` would be a second way
     * to spell it.
     */
    awaitingComparison: z.literal(true).optional(),
  })
  .strict();

/** One file's stored adjudication page. */
export type AdjudicationPage = z.infer<typeof AdjudicationPageSchema>;
