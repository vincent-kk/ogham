import type { FileFacts } from '../schema/fileFactsSchema.js';

/**
 * The lines two attesters independently read as not being references.
 *
 * Only lines both records name. One reader calling a line a non-reference is
 * the same single pair of eyes the attested tier exists to distrust; two is the
 * bar the tier already sets for accepting the record at all, so a line that
 * clears it has been judged exactly as thoroughly as an adjudicated dismissal.
 *
 * @param held - The attested record that was waiting for confirmation.
 * @param confirming - The attested record that confirmed it.
 * @returns Each agreed line mapped to the confirming record's reason for it.
 */
export function agreedNonReferences(
  held: FileFacts,
  confirming: FileFacts,
): Map<number, string> {
  const heldLines = new Set(
    (held.nonReferences ?? []).map((entry) => entry.line),
  );
  const agreed = new Map<number, string>();
  for (const entry of confirming.nonReferences ?? [])
    if (heldLines.has(entry.line)) agreed.set(entry.line, entry.reason);
  return agreed;
}
