import type {
  ManagedRuleDocument,
  RuleDocumentRequest,
} from "../../types/rules.js";
import { locateSectionRuleDocument } from "../helpers/locateSectionRuleDocument.js";
import type { StoredRuleDocumentInspection } from "../types/internal.js";
import type { SectionRulePlanningState } from "../types/sectionPlanning.js";
import { decideSectionRulePlacement } from "./decideSectionRulePlacement.js";
import { isMutatingRuleAction } from "./isMutatingRuleAction.js";
import { removeSectionRuleDocument } from "./removeSectionRuleDocument.js";
import { writeSectionRuleDocument } from "./writeSectionRuleDocument.js";

/**
 * Records one document outcome and its actual physical mutations.
 * @param state Mutable planning contents and outcome-to-path map.
 * @param request Desired selection and drift replacement policy.
 * @param document Validated managed document.
 * @param inspection Stored deployment facts used for placement.
 * @returns The updated planning state is retained in the supplied state.
 */
export function planSectionRuleDocument(
  state: SectionRulePlanningState,
  request: RuleDocumentRequest,
  document: ManagedRuleDocument,
  inspection: StoredRuleDocumentInspection,
): void {
  const location = locateSectionRuleDocument(
    state.owner,
    state.target,
    document,
  );
  const placement = decideSectionRulePlacement(
    state.target,
    request,
    document,
    inspection,
  );
  const outcomeIndex =
    state.outcomes.push({
      id: document.id,
      action: placement.decision.action,
      target: placement.outcomeTarget,
      ...(placement.decision.reason === undefined
        ? {}
        : { reason: placement.decision.reason }),
    }) - 1;

  const before = new Map(state.contents);
  removeSectionRuleDocument(state, document, location, placement);
  writeSectionRuleDocument(state, document, placement);
  state.outcomePaths.set(
    outcomeIndex,
    state.paths.filter((path) => before.get(path) !== state.contents.get(path)),
  );
  if (isMutatingRuleAction(placement.decision.action))
    state.mutatingOutcomeIndexes.add(outcomeIndex);
}
