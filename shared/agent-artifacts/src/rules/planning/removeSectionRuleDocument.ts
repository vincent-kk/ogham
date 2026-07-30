import { removeSection, sectionMarkers } from "@ogham/cross-platform";

import type { ManagedRuleDocument } from "../../types/rules.js";
import type { LocatedRuleDocument } from "../types/internal.js";
import type {
  SectionRulePlacement,
  SectionRulePlanningState,
} from "../types/sectionPlanning.js";

export function removeSectionRuleDocument(
  state: SectionRulePlanningState,
  document: ManagedRuleDocument,
  location: LocatedRuleDocument,
  placement: SectionRulePlacement,
): void {
  const { decision, destination } = placement;
  if (
    decision.action !== "remove" &&
    decision.action !== "relocate" &&
    !(
      decision.action === "update" &&
      (location.source === "legacy" || location.target !== destination)
    )
  )
    return;

  const filenames =
    decision.action === "remove" ||
    decision.action === "relocate" ||
    location.source === "legacy"
      ? [document.filename, ...(document.legacyFilenames ?? [])]
      : [document.filename];
  for (const filename of filenames) {
    const markers = sectionMarkers(state.namespace, filename);
    for (const path of state.paths) {
      const source = state.contents.get(path) as string;
      const next = removeSection(source, markers);
      if (next === null || next === source) continue;
      state.contents.set(path, next);
      state.changedPaths.add(path);
    }
  }
}
