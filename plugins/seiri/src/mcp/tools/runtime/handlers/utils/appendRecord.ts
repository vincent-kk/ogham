import {
  appendDirectiveLog,
  inspectDirectiveSet,
  summarizeDirectiveSet,
} from '../../../../../core/directives/index.js';
import type {
  DirectiveLog,
  DirectivesResult,
} from '../../../../../types/directives.js';

/** Longest accepted entry text, in characters; notepad and history entries are short notes. */
const MAX_TEXT_LENGTH = 1000;

/**
 * Validate an append request, write the line, and report the set afterwards.
 * @param root Checkout that owns the set.
 * @param set Existing set name.
 * @param log Requested record, which must be `notepad` or `history`.
 * @param text Entry content; nonblank after trimming and at most 1,000 characters.
 * @param now Clock value in epoch milliseconds, stamped by the core append.
 * @returns The set summary after the write with the remaining notepad line count.
 * @throws When `log` or `text` is invalid, or the set cannot be written because it is gone, unwritable or locked.
 */
export function appendRecord(
  root: string,
  set: string,
  log: DirectiveLog | undefined,
  text: string | undefined,
  now: number,
): DirectivesResult {
  if (log !== 'notepad' && log !== 'history')
    throw new Error('append requires log to be notepad or history');
  if (!text?.trim() || text.length > MAX_TEXT_LENGTH)
    throw new Error(
      `append requires nonblank text of at most ${MAX_TEXT_LENGTH} characters`,
    );
  if (!appendDirectiveLog(root, set, log, text, now))
    throw new Error('Directive set is unavailable or its lock is held');
  const summary = summarizeDirectiveSet(root, set);
  const inspection = inspectDirectiveSet(root, set);
  if (!summary || !inspection) throw new Error('Directive set does not exist');
  return {
    ...summary,
    status: 'ok',
    op: 'append',
    log,
    notepadLines: inspection.notepadLines,
  };
}
