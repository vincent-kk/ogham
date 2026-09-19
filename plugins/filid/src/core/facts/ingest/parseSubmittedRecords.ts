import { FileFactsSchema } from '../schema/fileFactsSchema.js';
import type { FileFacts } from '../schema/fileFactsSchema.js';
import type { FactsRejection } from '../validation/types/factsValidationTypes.js';
import { buildFactsRejection } from '../validation/utils/buildFactsRejection.js';

/** One submitted entry that parsed, kept with where it sat in the document. */
export interface ParsedSubmission {
  facts: FileFacts;
  pointer: string;
}

/** Entries that matched the schema, and pointers to the ones that did not. */
export interface SubmissionParse {
  parsed: ParsedSubmission[];
  rejections: FactsRejection[];
}

/**
 * Validate each submitted entry against the record schema, one at a time.
 *
 * Per entry rather than per document: one malformed record must not discard a
 * whole repository batch, because the caller's next action then covers thousands
 * of records it cannot see anything wrong with (P5).
 *
 * A schema rejection carries the JSON pointer and nothing else — not even the
 * `path` the entry claims. Zod's own issue messages quote the value they
 * rejected, and an entry that failed the schema is not known to be a facts
 * record at all, so echoing any field of it would let a caller read an arbitrary
 * file back out of an error message by pointing `submit` at it. Rejections for
 * entries that did parse do name their path: those are records, and §2.4
 * requires the caller to learn which files were refused.
 *
 * @param entries - Top-level elements of the submitted JSON array.
 * @returns The records to check further, and one rejection per off-schema entry.
 */
export function parseSubmittedRecords(
  entries: readonly unknown[],
): SubmissionParse {
  const parsed: ParsedSubmission[] = [];
  const rejections: FactsRejection[] = [];
  for (const [index, entry] of entries.entries()) {
    const pointer = `/${index}`;
    const result = FileFactsSchema.safeParse(entry);
    if (!result.success) {
      rejections.push(buildFactsRejection('', pointer, 'SCHEMA_INVALID'));
      continue;
    }
    parsed.push({ facts: result.data, pointer });
  }
  return { parsed, rejections };
}
