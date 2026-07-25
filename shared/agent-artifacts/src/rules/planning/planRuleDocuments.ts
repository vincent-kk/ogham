import type {
  RuleDocumentManagerOptions,
  RuleDocumentRequest,
} from "../../types/rules.js";
import type { PreparedRulePlan } from "../types/internal.js";
import { planDirectoryRules } from "./planDirectoryRules.js";
import { planSectionRules } from "./planSectionRules.js";

export function planRuleDocuments(
  options: RuleDocumentManagerOptions,
  request: RuleDocumentRequest,
): PreparedRulePlan {
  return options.target.kind === "directory"
    ? planDirectoryRules(options.owner, options.target, request)
    : planSectionRules(options.owner, options.target, request);
}
