import type { SectionArtifactTarget } from "../../targets/index.js";
import type {
  ManagedRuleDocument,
  RuleDocumentRequest,
} from "../../types/rules.js";
import type { StoredRuleDocumentInspection } from "../types/internal.js";
import type { SectionRulePlacement } from "../types/sectionPlanning.js";
import { decideRuleAction } from "./decideRuleAction.js";

export function decideSectionRulePlacement(
  target: SectionArtifactTarget,
  request: RuleDocumentRequest,
  document: ManagedRuleDocument,
  inspection: StoredRuleDocumentInspection,
): SectionRulePlacement {
  let decision = decideRuleAction({
    desired: request.desired.has(document.id),
    deployed: inspection.deployed,
    contentAvailable: document.content !== null,
    matches: inspection.inSync,
    replaceDrift: request.replaceDrift.has(document.id),
  });
  if (
    decision.action === "unchanged" &&
    request.desired.has(document.id) &&
    (inspection.source === "legacy" ||
      (target.placement === "effective" &&
        inspection.source === "current" &&
        inspection.target !== target.effectivePath))
  )
    decision = { action: "relocate" };

  const destination =
    decision.action === "update" &&
    inspection.source === "current" &&
    target.placement === "existing-or-effective"
      ? inspection.target
      : target.effectivePath;
  const outcomeTarget =
    decision.action === "copy" ||
    decision.action === "update" ||
    decision.action === "relocate"
      ? destination
      : inspection.target;
  return { decision, destination, outcomeTarget };
}
