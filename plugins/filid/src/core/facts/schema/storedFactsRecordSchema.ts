import { z } from 'zod';

import {
  FACTS_REJECTION_CODES,
  FACTS_SCHEMA_VERSION,
} from '../../../constants/facts.js';

import { FileFactsSchema } from './fileFactsSchema.js';

/**
 * One claim filid refused, kept with the record it was refused from.
 *
 * The code and nothing derivable from it: the sentence that says what to do
 * lives in one constant and is looked up when the rejection is reported, so
 * improving the wording does not leave a thousand stored records saying the old
 * thing. No file text is kept — a path, a specifier and line numbers only.
 */
const StoredRejectionSchema = z
  .object({
    code: z.nativeEnum(FACTS_REJECTION_CODES),
    /** The reference's specifier, on a reference-level rejection. */
    specifier: z.string().min(1).optional(),
    /** The declared resolution input that caused it, path only. */
    inputPath: z.string().min(1).optional(),
    /** 1-based lines the caller has to read to fix it. */
    lines: z.array(z.number().int().positive()).optional(),
  })
  .strict();

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
     * The submission's references and exported names filid refused.
     *
     * Server-owned, and kept because a file whose claims were partly rejected is
     * `uncertain` (spec §3) long after the submit call that rejected them has
     * returned — without it, a narrowed record would read as a complete one. The
     * reasons are kept rather than only the count so a session that never saw
     * that submit response can still be told why, and what to do instead of
     * re-running the tool that will be refused the same way.
     */
    rejectedClaims: z.array(StoredRejectionSchema),
    /**
     * In-project edges the last readable record carried, kept while the file
     * is `tool-error`.
     *
     * Server-owned. A `toolError` record claims nothing about references, so
     * it cannot be compared against — and without this the next record that
     * claims nothing either is compared against an empty list and drops every
     * edge with no item to judge (spec §2.4). Absent unless the stored record
     * is a `toolError` one.
     */
    shrinkBaseline: FileFactsSchema.shape.references.optional(),
    facts: FileFactsSchema,
  })
  .strict();

/** One refused claim as a record keeps it. */
export type StoredRejection = z.infer<typeof StoredRejectionSchema>;

/** One accepted facts record as it is stored and read back. */
export type StoredFactsRecord = z.infer<typeof StoredFactsRecordSchema>;
