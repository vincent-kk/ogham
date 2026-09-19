import type { FactsProvenance } from '../../schema/fileFactsSchema.js';

/** Whether a record's declared inputs still hold, and which one did not. */
export type DeclaredInputVerdict =
  | { ok: true }
  | { ok: false; reason: 'stale' | 'unreadable'; path: string };

/**
 * Check every input a record declared against the file it names now.
 *
 * This binds a record's resolution to the files its provider actually consulted,
 * now that those declarations no longer enter the project epoch. A record
 * survives a path-list change that cannot affect it, and stops being valid the
 * moment a config it named changes — including one outside the project, which
 * the project epoch cannot see at all (spec §2.2).
 *
 * The two failures are kept apart because their next actions are opposites.
 * `stale` means the file changed, and re-extracting fixes it. `unreadable`
 * means filid will not read that path at all — missing, irregular, past the cap,
 * or permission-denied — and re-extracting reproduces the identical refusal, so
 * the caller has to change the declaration, the file, or the tier instead (P5).
 *
 * @param provenance - The record's provenance, carrying its declared inputs.
 * @param hashDeclaredInput - Per-call memoized hasher; null means unreadable.
 * @returns The first failure with the path that caused it, or `ok` when every
 * declared input matches — including when none was declared.
 */
export function checkDeclaredInputs(
  provenance: FactsProvenance,
  hashDeclaredInput: (path: string) => string | null,
): DeclaredInputVerdict {
  for (const input of provenance.resolutionInputs) {
    const current = hashDeclaredInput(input.path);
    if (current === null)
      return { ok: false, reason: 'unreadable', path: input.path };
    if (current !== input.contentHash)
      return { ok: false, reason: 'stale', path: input.path };
  }
  return { ok: true };
}
