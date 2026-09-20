import {
  FACTS_ADJUDICATION_ORIGINS,
  FACTS_ADJUDICATION_STATES,
} from '../../../../../constants/facts.js';
import { computeLineDigest } from '../../../../../core/facts/index.js';
import type {
  AdjudicationItem,
  AdjudicationPageUpdate,
  AdjudicationTableContents,
  ProjectFileDigest,
  ReferenceComparison,
} from '../../../../../core/facts/index.js';

/**
 * Work out one file's page after a comparison, without writing anything.
 *
 * Compute and persist are split because a batch touches many files and the
 * shards they land in overlap: the write has to see every page at once to make
 * one pass per shard. Returning the page instead of storing it is what lets the
 * caller do that.
 *
 * An item already on the table is left as it stands rather than reset — running
 * `compare` again must not undo a judgement — and an item whose judged lines
 * have changed is dropped, because what was judged is no longer there.
 *
 * @param table - The side table as this call read it.
 * @param key - Digest of the file's project-relative path.
 * @param path - The file's project-relative POSIX path.
 * @param current - That file's current digest and bytes.
 * @param comparison - The comparison for that file.
 * @returns The page this file should end up with.
 */
export function planSideTableForCompare(
  table: AdjudicationTableContents,
  key: string,
  path: string,
  current: Extract<ProjectFileDigest, { ok: true }>,
  comparison: ReferenceComparison,
): AdjudicationPageUpdate {
  const items = (table.pages.get(key)?.items ?? []).filter(
    (item) =>
      item.lineDigest === computeLineDigest(current.contents, item.reference),
  );
  for (const [origin, bucket] of [
    [FACTS_ADJUDICATION_ORIGINS.MISSING_IN_STORE, comparison.missingInStore],
    [
      FACTS_ADJUDICATION_ORIGINS.RESOLUTION_DIFFERS,
      comparison.resolutionDiffers,
    ],
  ] as const)
    for (const one of bucket) {
      if (one.resolvedPath === null) continue;
      const already = items.some(
        (item) =>
          item.kind === one.kind &&
          item.reference === one.reference &&
          item.resolvedPath === one.resolvedPath,
      );
      if (already) continue;
      items.push({
        path,
        kind: one.kind,
        reference: one.reference,
        resolvedPath: one.resolvedPath,
        origin,
        state: FACTS_ADJUDICATION_STATES.UNADJUDICATED,
        lineDigest: computeLineDigest(current.contents, one.reference),
        contentHash: current.contentHash,
      } satisfies AdjudicationItem);
    }
  return { path, items };
}
