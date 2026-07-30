import { mergeSection, sectionMarkers } from "@ogham/cross-platform";

import type { ManagedRuleDocument } from "../../types/rules.js";
import type {
  SectionRulePlacement,
  SectionRulePlanningState,
} from "../types/sectionPlanning.js";

export function writeSectionRuleDocument(
  state: SectionRulePlanningState,
  document: ManagedRuleDocument,
  placement: SectionRulePlacement,
): void {
  if (
    (placement.decision.action !== "copy" &&
      placement.decision.action !== "update" &&
      placement.decision.action !== "relocate") ||
    document.content === null
  )
    return;

  const source = state.contents.get(placement.destination) as string;
  const next = mergeSection(
    source,
    sectionMarkers(state.namespace, document.filename),
    document.content,
  );
  if (next === source) return;
  state.contents.set(placement.destination, next);
  state.changedPaths.add(placement.destination);
}
