import type { AdjudicationPageUpdate } from '../../../../../core/facts/index.js';

import type { SubmitSideTablePlan } from './planSideTableForSubmit.js';

/** One submission's page writes, split by which side of the record they go. */
export interface SideTablePhases {
  /** Pages to write before the records, carrying this call's opens only. */
  opening: Map<string, AdjudicationPageUpdate>;
  /** Pages to write after them, carrying what the records settled. */
  settling: Map<string, AdjudicationPageUpdate>;
}

/**
 * Split planned pages by what is safe in each failure direction.
 *
 * A write that **opens** an item is safe before its record: if the record then
 * fails to land, the file is left uncertain over an edge the stored record still
 * carries, which costs a judgement and hides nothing. A write that **settles**
 * one — `closed-by-record`, an attesters' dismissal, or clearing a page whose
 * file left the tree — is only safe after it: an item closed by a record that is
 * not in the store drops that edge with nobody having judged it (spec §2.4).
 *
 * A page that does both appears in both phases, so the settling batch must chain
 * its compare-and-set from what the opening batch wrote.
 *
 * @param plans - Planned pages keyed by path digest, as `planSideTableForSubmit`
 * returned them.
 * @returns The two batches; a page with nothing to open is only in `settling`,
 * and one with nothing to settle is only in `opening`.
 */
export function splitSideTablePhases(
  plans: ReadonlyMap<string, SubmitSideTablePlan>,
): SideTablePhases {
  const phases: SideTablePhases = { opening: new Map(), settling: new Map() };
  for (const [key, plan] of plans) {
    const opens = plan.opened + plan.dismissedByAttesters > 0;
    if (opens) phases.opening.set(key, { path: plan.path, items: plan.opening });
    if (!opens || plan.closedByRecord + plan.dismissedByAttesters > 0)
      phases.settling.set(key, { path: plan.path, items: plan.items });
  }
  return phases;
}
