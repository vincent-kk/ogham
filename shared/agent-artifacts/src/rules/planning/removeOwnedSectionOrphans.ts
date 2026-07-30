import { removeSection, sectionMarkers } from "@ogham/cross-platform";

import { findOwnedRuleSections } from "../helpers/findOwnedRuleSections.js";
import type { SectionRulePlanningState } from "../types/sectionPlanning.js";

export function removeOwnedSectionOrphans(
  state: SectionRulePlanningState,
  knownFilenames: ReadonlySet<string>,
): void {
  for (const path of state.paths)
    for (const filename of findOwnedRuleSections(
      state.contents.get(path) as string,
      state.owner,
    )) {
      if (knownFilenames.has(filename)) continue;
      const source = state.contents.get(path) as string;
      const next = removeSection(
        source,
        sectionMarkers(state.namespace, filename),
      );
      if (next === null || next === source) continue;
      state.contents.set(path, next);
      state.changedPaths.add(path);
      const outcomeIndex =
        state.outcomes.push({
          id: filename,
          action: "remove",
          target: path,
        }) - 1;
      state.mutatingOutcomeIndexes.add(outcomeIndex);
    }
}
