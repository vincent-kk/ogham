import type { FileFacts } from '../schema/fileFactsSchema.js';

/** One reference that only one of the two attestations reports. */
export interface AttestationDifference {
  /** `sourceText ?? specifier` as the record spells it. */
  reference: string;
  kind: FileFacts['references'][number]['kind'];
  /** The in-project target, or null for every other resolution. */
  resolvedPath: string | null;
  /** Which attestation carries it. */
  side: 'pending' | 'submitted';
}

/** Separator that cannot occur in a reference, a kind or a path. */
const SEPARATOR = String.fromCharCode(0);

/**
 * Compare what two attestations claim about one file.
 *
 * Identity is the whole triple — the reference string, its kind and where it
 * resolves — because a second reader agreeing that a specifier exists while
 * resolving it elsewhere has not confirmed the edge, and the edge is what a
 * record is read for.
 *
 * Both directions are reported. A second reader that only ever added would be
 * confirmed by an attestation that dropped half the file, which is the omission
 * the second reader exists to catch.
 *
 * @param pending - The attested record held unconfirmed.
 * @param submitted - The attested record offered as confirmation.
 * @returns Every reference only one side carries, pending's first.
 */
export function comparePendingEdges(
  pending: FileFacts,
  submitted: FileFacts,
): AttestationDifference[] {
  const held = keyed(pending);
  const offered = keyed(submitted);
  const differences: AttestationDifference[] = [];
  for (const [key, reference] of held)
    if (!offered.has(key)) differences.push({ ...reference, side: 'pending' });
  for (const [key, reference] of offered)
    if (!held.has(key)) differences.push({ ...reference, side: 'submitted' });
  return differences;
}

/**
 * Index one record's references by the triple two attestations are compared on.
 * @param facts The record to index.
 * @returns Each reference keyed by string, kind and resolved target.
 */
function keyed(
  facts: FileFacts,
): Map<string, Omit<AttestationDifference, 'side'>> {
  const byKey = new Map<string, Omit<AttestationDifference, 'side'>>();
  for (const reference of facts.references) {
    const entry = {
      reference: reference.sourceText ?? reference.specifier,
      kind: reference.kind,
      resolvedPath:
        'path' in reference.resolved ? reference.resolved.path : null,
    };
    byKey.set(
      [entry.kind, entry.reference, entry.resolvedPath ?? ''].join(SEPARATOR),
      entry,
    );
  }
  return byKey;
}
