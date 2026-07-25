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

  removeSectionRuleDocument(state, document, location, placement);
  writeSectionRuleDocument(state, document, placement);
  if (isMutatingRuleAction(placement.decision.action))
    state.mutatingOutcomeIndexes.add(outcomeIndex);
}
