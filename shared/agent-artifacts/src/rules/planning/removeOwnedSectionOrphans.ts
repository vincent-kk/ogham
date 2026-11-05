import { removeSection, sectionMarkers } from "@ogham/cross-platform";

import { findOwnedRuleSections } from "../helpers/findOwnedRuleSections.js";
import type { SectionRulePlanningState } from "../types/sectionPlanning.js";

/**
 * Plans removal of unshipped owned sections and records each changed path.
 * @param state Mutable planning contents and physical outcome dependencies.
 * @param knownFilenames Shipped current and legacy filenames to retain.
 * @returns The updated planning state is retained in the supplied state.
 */
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
      state.outcomePaths.set(outcomeIndex, [path]);
    }
}
