import type { FileChange } from "../../transactions/index.js";
import type { SectionRulePlanningState } from "../types/sectionPlanning.js";

export function buildSectionRuleChanges(
  state: SectionRulePlanningState,
): readonly FileChange[] {
  return state.paths
    .filter((path) => state.changedPaths.has(path))
    .map((path) => ({
      targetPath: path,
      content: state.contents.get(path) as string,
      root: state.target.root,
    }));
}
