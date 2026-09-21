import { FACTS_FILE_STATES } from '../../../../../constants/facts.js';
import { REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS } from '../../../../../constants/reviewState.js';
import {
  classifyProjectFacts,
  isOpenAdjudication,
} from '../../../../../core/facts/index.js';
import type { ProjectFacts } from '../../../../../core/facts/index.js';
import type { NormalizedFileFacts } from '../../../../../types/fractal.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

import { buildFactsDiscrepancyRefusal } from './buildFactsDiscrepancyRefusal.js';
import { collectChangedFrozenEdges } from './collectChangedFrozenEdges.js';

/** One side-table item a seal read, as the sealed state records it. */
export interface SealedAdjudicationRecord {
  path: string;
  kind: string;
  reference: string;
  resolvedPath: string;
  state: string;
  lineDigest: string;
}

/** What the live store says about the files this generation froze. */
export interface FactsDiscrepancy {
  /** Refusals to return instead of folding a verdict; empty when none. */
  diagnostics: ToolDiagnostic[];
  /** Every item the check read, for the sealed state to record. */
  items: SealedAdjudicationRecord[];
}

/**
 * Compare the live store with the facts this generation was judged on.
 *
 * Two things stop a verdict (spec §9). An item nobody has settled: the review
 * would be publishing a judgement about references somebody disputes. And a
 * file whose valid edges are no longer the frozen ones — in either direction,
 * because both directions are the same mistake. An edge added since the freeze
 * was never read; an edge removed since it was read is a conclusion resting on
 * something that is not there any more, and a conclusion that requires an
 * absence would be suppressed by the ghost.
 *
 * A file the freeze recorded in any state but `exact` is compared only once
 * the store can answer for it. Its frozen references are empty because nothing
 * could read it, not because it has no edges, so demanding they match while it
 * still cannot be read would refuse forever: the prepare gate lets
 * `tool-error` through on purpose, so a new generation would freeze the same
 * empty list and seal would refuse again (P5). That file is already reported
 * to the review as a `facts-tool-error` candidate. But once it IS readable —
 * somebody resubmitted it mid-review — its edges were never judged by anyone,
 * and sealing over them is the silent pass this check exists to stop.
 *
 * Read-only, and not part of any hash: this is a refusal at seal time, not an
 * input to freshness, so a review is never made stale by somebody else's work.
 * Both halves read the one store read the caller passes in — two reads could
 * see the side table at two moments and answer from both.
 *
 * The frozen facts hold every file the review claims about, empty where the
 * file had no edge, so a path missing from them is one the review never looked
 * at and an item on it is somebody else's business.
 *
 * @param projectRoot - Absolute project root whose store is read.
 * @param frozenFacts - The generation's frozen facts, as prepare wrote them.
 * @param facts - One read of the live store, for its current valid references.
 * @returns The refusals owed and the items they were derived from.
 */
export function detectFactsDiscrepancy(
  projectRoot: string,
  frozenFacts: readonly NormalizedFileFacts[],
  facts: ProjectFacts,
): FactsDiscrepancy {
  const liveStates = classifyProjectFacts(projectRoot, facts);
  const diagnostics: ToolDiagnostic[] = [];
  const items: SealedAdjudicationRecord[] = [];
  for (const entry of frozenFacts) {
    const page = facts.adjudications.get(entry.path);
    for (const item of page?.items ?? []) {
      items.push({
        path: entry.path,
        kind: item.kind,
        reference: item.reference,
        resolvedPath: item.resolvedPath,
        state: item.state,
        lineDigest: item.lineDigest,
      });
      if (
        entry.state === FACTS_FILE_STATES.EXACT &&
        isOpenAdjudication(item.state)
      )
        diagnostics.push(
          buildFactsDiscrepancyRefusal(
            projectRoot,
            entry.path,
            item.reference,
            REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_DISCREPANCY_UNSETTLED,
            `${item.reference} in ${entry.path} is reported as resolving to ${item.resolvedPath}, and nobody has settled whether it does.`,
          ),
        );
    }
    if (
      entry.state !== FACTS_FILE_STATES.EXACT &&
      liveStates.get(entry.path) !== FACTS_FILE_STATES.EXACT
    )
      continue;
    for (const [reference, message] of collectChangedFrozenEdges(facts, entry))
      diagnostics.push(
        buildFactsDiscrepancyRefusal(
          projectRoot,
          entry.path,
          reference,
          REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_DISCREPANCY_FROZEN_EDGES_CHANGED,
          message,
        ),
      );
  }
  return { diagnostics, items };
}
