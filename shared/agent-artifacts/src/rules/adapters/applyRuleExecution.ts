import type { ArtifactApplyResult } from "../../types/artifacts.js";
import type { RuleDocumentPlan } from "../../types/rules.js";
import type { RuleExecution } from "../types/internal.js";
import { applyDirectoryRules } from "./applyDirectoryRules.js";
import { applySectionRules } from "./applySectionRules.js";

export function applyRuleExecution(
  plan: RuleDocumentPlan,
  execution: RuleExecution,
): ArtifactApplyResult {
  return execution.kind === "directory"
    ? applyDirectoryRules(plan, execution)
    : applySectionRules(plan, execution);
}
