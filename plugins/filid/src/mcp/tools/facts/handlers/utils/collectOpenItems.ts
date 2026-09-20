import {
  computeLineDigest,
  hashProjectFile,
  isOpenAdjudication,
} from '../../../../../core/facts/index.js';
import type { FactsOpenItem } from '../../types/factsToolTypes.js';

import type { FactsContext } from './buildFactsContext.js';
import { describeAdjudicationItems } from './describeAdjudicationItems.js';

/**
 * Every item the agent can act on, across the whole side table.
 *
 * Only work it can actually do, and the bar is exactly what `adjudicate` will
 * accept. An item whose file left the tree or the scope cannot be judged — there
 * is no current `contentHash` to quote — and a file that cannot be read has no
 * hash either. Expiry is applied here for the same reason: `adjudicate` drops an
 * item whose judged lines have changed, so listing one would send the agent to a
 * refusal that calling status again cannot lift (P5).
 *
 * Read-only: an expired item is left on the page for the next writing action to
 * clear, exactly as it is today.
 *
 * The pages come from the one read the call already made: reading the table a
 * second time would let another actor's judgement land between the two, and
 * the response would then say a file is uncertain while listing nothing to
 * judge for it.
 * @param projectRoot - Absolute project root, used as given.
 * @param context - Scope, scanned paths, store paths and adjudications of this call.
 * @returns Open items, grouped by file and ordered by path.
 */
export function collectOpenItems(
  projectRoot: string,
  context: FactsContext,
): FactsOpenItem[] {
  const pages = [...context.adjudications.values()]
    .filter(
      (page) =>
        context.scannedSet.has(page.path) && context.scope.covers(page.path),
    )
    .sort((left, right) => left.path.localeCompare(right.path));
  const described: FactsOpenItem[] = [];
  for (const page of pages) {
    const open = page.items.filter((item) => isOpenAdjudication(item.state));
    if (open.length === 0) continue;
    const current = hashProjectFile(projectRoot, page.path);
    if (!current.ok) continue;
    const items = open.filter(
      (item) =>
        item.lineDigest === computeLineDigest(current.contents, item.reference),
    );
    described.push(...describeAdjudicationItems(items, current));
  }
  return described;
}
