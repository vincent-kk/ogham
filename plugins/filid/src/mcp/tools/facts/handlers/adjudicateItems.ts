import {
  FACTS_ACTIONS,
  FACTS_ADJUDICATION_ACTOR_CODE,
  FACTS_ADJUDICATION_ACTOR_NEXT_ACTION,
  FACTS_ADJUDICATION_REFUSALS,
  FACTS_ADJUDICATION_REFUSAL_NEXT_ACTIONS,
  FACTS_ADJUDICATION_STALE_CODE,
  FACTS_ADJUDICATION_STALE_NEXT_ACTION,
  FACTS_DECISIONS,
} from '../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  adjudicateItem,
  computeLineDigest,
  hashProjectFile,
  normalizeActor,
  readAdjudicationTable,
  writeAdjudicationPages,
} from '../../../../core/facts/index.js';
import type { AdjudicationItem } from '../../../../core/facts/index.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import type {
  AdjudicateInput,
  FactsAdjudicateData,
  FactsAdjudicateSummary,
} from '../types/factsToolTypes.js';

import { buildFactsContext } from './utils/buildFactsContext.js';
import { buildSideTableConflictDiagnostics } from './utils/buildSideTableConflictDiagnostics.js';
import { buildRefusedAdjudicationPayload } from './utils/buildRefusedAdjudicationPayload.js';
import { buildUninitializedAdjudicatePayload } from './utils/buildUninitializedAdjudicatePayload.js';

/**
 * Apply one actor's decisions to the side table for one file (spec §4.5).
 *
 * The whole call is bound to the file's bytes. A judgement is a claim about
 * specific lines, so accepting one made against bytes that have since changed
 * would record a decision nobody actually made about the current text; the call
 * is refused with the action that fixes it rather than partly applied.
 *
 * Expiry is applied on the way in, before any decision lands: an item whose
 * judged lines have changed is gone, so adopting an edge whose import line was
 * deleted is not something this call can do.
 *
 * Only the items this call judged are re-stamped with the current bytes. That is
 * what keeps `staleUnderNewContent` meaning "changed since it was judged": an
 * item nobody re-read in this call was not re-judged either, and clearing its
 * staleness would claim a reading that never happened.
 *
 * Within a valid call each item stands alone: an item the table does not hold is
 * refused on its own and the rest still land, because one stale entry in a batch
 * must not cost the judgements beside it.
 *
 * @param input - Project root, the file, the bytes judged, the actor and items.
 * @returns What each item became, and what is owed next for the ones that need
 * a second actor.
 */
export async function adjudicateItems(
  input: AdjudicateInput,
): Promise<ToolPayload<FactsAdjudicateSummary, FactsAdjudicateData>> {
  const context = await buildFactsContext(input.path);
  if (!context.scope.declared)
    return buildUninitializedAdjudicatePayload(input.path, input.sourcePath);
  const current = hashProjectFile(input.path, input.sourcePath);
  if (!current.ok || current.contentHash !== input.contentHash)
    return buildRefusedAdjudicationPayload({
      projectRoot: input.path,
      sourcePath: input.sourcePath,
      code: FACTS_ADJUDICATION_STALE_CODE,
      message: `${input.sourcePath} does not hash to the contentHash this call carried, so nothing was judged.`,
      nextAction: FACTS_ADJUDICATION_STALE_NEXT_ACTION,
    });
  if (normalizeActor(input.actor) === null)
    return buildRefusedAdjudicationPayload({
      projectRoot: input.path,
      sourcePath: input.sourcePath,
      code: FACTS_ADJUDICATION_ACTOR_CODE,
      message:
        'This call named no actor that survives folding, so nothing was judged.',
      nextAction: FACTS_ADJUDICATION_ACTOR_NEXT_ACTION,
    });
  const table = readAdjudicationTable(context.storePaths.sideTableDirectory);
  const key = context.storePaths.pathDigest(input.sourcePath);
  const before = table.pages.get(key)?.items ?? [];
  const items = before.filter(
    (item) =>
      item.lineDigest === computeLineDigest(current.contents, item.reference),
  );
  const outcomes: FactsAdjudicateData['outcomes'] = [];
  const refused: FactsAdjudicateData['refused'] = [];
  let applied = 0;
  for (const decision of input.items) {
    if (
      decision.decision === FACTS_DECISIONS.DISMISS &&
      (decision.reason ?? '') === ''
    ) {
      refused.push(refusal(decision.reference, 'REASON_REQUIRED'));
      continue;
    }
    const at = items.findIndex(
      (candidate) =>
        candidate.kind === decision.kind &&
        candidate.reference === decision.reference &&
        candidate.resolvedPath === decision.resolvedPath,
    );
    if (at === -1) {
      refused.push(refusal(decision.reference, 'NO_SUCH_ITEM'));
      continue;
    }
    const outcome = adjudicateItem(
      items[at] as AdjudicationItem,
      decision.decision,
      input.actor,
    );
    if (outcome.changed) applied += 1;
    items[at] = {
      ...(items[at] as AdjudicationItem),
      state: outcome.state,
      contentHash: current.contentHash,
      ...(outcome.actor === undefined ? {} : { actor: outcome.actor }),
      ...(decision.reason === undefined ? {} : { reason: decision.reason }),
    };
    outcomes.push({
      reference: decision.reference,
      resolvedPath: decision.resolvedPath,
      state: outcome.state,
      changed: outcome.changed,
      nextAction: outcome.nextAction,
    });
  }
  // Compared as pages, not by whether a decision landed: expiry changes the
  // page too, and a call that changed nothing must not write — cell 19's
  // refusal would otherwise create an empty shard file.
  const unchanged = JSON.stringify(items) === JSON.stringify(before);
  const written = unchanged
    ? { stored: new Set([key]), conflicted: [] as string[], damaged: [] as string[] }
    : writeAdjudicationPages(
        context.storePaths.sideTableDirectory,
        table,
        new Map([[key, { path: input.sourcePath, items }]]),
        context.storePaths.shardFileName,
      );
  return {
    projectRoot: input.path,
    status:
      written.conflicted.length + written.damaged.length > 0
        ? TOOL_STATUSES.INDETERMINATE
        : TOOL_STATUSES.OK,
    summary: {
      sourcePath: input.sourcePath,
      applied,
      refused: refused.length,
      awaitingConfirmation: outcomes.filter(
        (outcome) => outcome.nextAction !== '',
      ).length,
      stored: written.conflicted.length + written.damaged.length === 0,
    },
    data: { outcomes, refused },
    diagnostics: buildSideTableConflictDiagnostics(
      written.conflicted,
      written.damaged,
      FACTS_ACTIONS.ADJUDICATE,
    ),
  };
}

/**
 * Build one per-item refusal.
 * @param reference The reference the caller named.
 * @param code Key into the refusal code and next-action tables.
 * @returns The refusal to return in `refused[]`.
 */
function refusal(
  reference: string,
  code: keyof typeof FACTS_ADJUDICATION_REFUSALS,
): FactsAdjudicateData['refused'][number] {
  return {
    reference,
    code: FACTS_ADJUDICATION_REFUSALS[code],
    nextAction: FACTS_ADJUDICATION_REFUSAL_NEXT_ACTIONS[code],
  };
}
