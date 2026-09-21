import { locateSourceText } from '../../../../../core/facts/index.js';
import type {
  AdjudicationItem,
  ProjectFileDigest,
} from '../../../../../core/facts/index.js';
import type { FactsOpenItem } from '../../types/factsToolTypes.js';

/**
 * Describe stored items against the file as it now stands.
 *
 * Two fields are computed rather than stored, and both are about the reader
 * rather than the record: the lines come from the current bytes, so an item
 * always names text that is really there, and `contentHash` is the file's
 * current digest, which is the value an `adjudicate` call has to carry. The
 * item's own recorded hash survives only as `staleUnderNewContent`, which is
 * what "judged against text that has since changed" means.
 *
 * @param items - Items from one file's page, in stored order.
 * @param current - That file's current digest and bytes.
 * @returns One description per item, ready to return in a response.
 */
export function describeAdjudicationItems(
  items: readonly AdjudicationItem[],
  current: Extract<ProjectFileDigest, { ok: true }>,
): FactsOpenItem[] {
  const lines = current.contents.toString('utf8').split(/\r\n|\r|\n/);
  return items.map((item) => ({
    path: item.path,
    kind: item.kind,
    reference: item.reference,
    resolvedPath: item.resolvedPath,
    origin: item.origin,
    state: item.state,
    lines: locateSourceText(lines, item.reference),
    contentHash: current.contentHash,
    staleUnderNewContent: item.contentHash !== current.contentHash,
    ...(item.actor === undefined ? {} : { actor: item.actor }),
    ...(item.reason === undefined ? {} : { reason: item.reason }),
  }));
}
