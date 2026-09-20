import { FACTS_ADJUDICATION_ORIGINS } from '../../../constants/facts.js';
import type { FactsReference } from '../schema/fileFactsSchema.js';

import type { AdjudicationOrigin } from './types/adjudicationTypes.js';

/** One reference reduced to what comparison is defined on (spec §4.5). */
export interface ComparableReference {
  /** `sourceText ?? specifier`. */
  reference: string;
  kind: FactsReference['kind'];
  /** The in-project path it resolved to, or null for every other resolution. */
  resolvedPath: string | null;
}

/** How a candidate's references differ from what the store holds. */
export interface ReferenceComparison {
  /** In-project edges the candidate has and the store does not. */
  missingInStore: ComparableReference[];
  /** In-project edges the store has and the candidate does not. */
  missingInCandidate: ComparableReference[];
  /** Same reference, both resolving in-project, to different files. */
  resolutionDiffers: ComparableReference[];
  /**
   * Differences that carry no edge either way.
   *
   * An `external`, `unresolved` or `nonLiteral` resolution makes no dependency
   * edge under any rule, so a tool that over-reports them cannot flood the side
   * table or turn files `uncertain` — they are reported and nothing more.
   */
  informational: ComparableReference[];
}

/** Separator that cannot occur in a reference or a kind. */
const KEY_SEPARATOR = String.fromCharCode(0);

/**
 * Compare a candidate extraction against the edges the store holds.
 *
 * Identity is `(sourceText ?? specifier, kind)` and the resolution, as the spec
 * defines it: two tools reporting the same string for the same reason are
 * talking about the same reference even when they resolve it differently, and
 * that disagreement is exactly what has to surface.
 *
 * Only in-project resolutions become candidates for judgement. Everything else
 * is informational — no rule draws a conclusion from it, so nothing about it can
 * hide a violation.
 *
 * @param candidate - References the independently run tool reported.
 * @param stored - References currently held for that file, records plus adopted.
 * @returns The four buckets, in the order the inputs presented them.
 */
export function compareReferences(
  candidate: readonly ComparableReference[],
  stored: readonly ComparableReference[],
): ReferenceComparison {
  const storedByKey = new Map(stored.map((one) => [keyOf(one), one]));
  const candidateByKey = new Map(candidate.map((one) => [keyOf(one), one]));
  const comparison: ReferenceComparison = {
    missingInStore: [],
    missingInCandidate: [],
    resolutionDiffers: [],
    informational: [],
  };
  for (const one of candidate) {
    const match = storedByKey.get(keyOf(one));
    if (one.resolvedPath === null) {
      if (match === undefined || match.resolvedPath !== null)
        comparison.informational.push(one);
      continue;
    }
    if (match === undefined) comparison.missingInStore.push(one);
    else if (match.resolvedPath === null) comparison.informational.push(one);
    else if (match.resolvedPath !== one.resolvedPath)
      comparison.resolutionDiffers.push(one);
  }
  for (const one of stored)
    if (!candidateByKey.has(keyOf(one))) comparison.missingInCandidate.push(one);
  return comparison;
}

/**
 * The identity two references are compared on.
 * @param one Reference to key.
 * @returns A key combining the reported string and the kind.
 */
function keyOf(one: ComparableReference): string {
  return `${one.kind}${KEY_SEPARATOR}${one.reference}`;
}

/**
 * The side-table origin a comparison bucket contributes.
 * @param bucket Which bucket the item came from.
 * @returns The origin to record on the item.
 */
export function originOf(
  bucket: 'missingInStore' | 'resolutionDiffers',
): AdjudicationOrigin {
  return bucket === 'missingInStore'
    ? FACTS_ADJUDICATION_ORIGINS.MISSING_IN_STORE
    : FACTS_ADJUDICATION_ORIGINS.RESOLUTION_DIFFERS;
}
