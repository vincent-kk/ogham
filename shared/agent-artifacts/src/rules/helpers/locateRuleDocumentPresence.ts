import type {
  RuleDocumentManagerOptions,
  RuleDocumentPresence,
  RuleDocumentSelector,
} from "../../types/rules.js";
import { locateDirectoryRulePresence } from "./locateDirectoryRulePresence.js";
import { locateSectionRulePresence } from "./locateSectionRulePresence.js";

export function locateRuleDocumentPresence(
  options: RuleDocumentManagerOptions,
  selector: RuleDocumentSelector,
): RuleDocumentPresence {
  return options.target.kind === "directory"
    ? locateDirectoryRulePresence(options.target, selector)
    : locateSectionRulePresence(options.owner, options.target, selector);
}
