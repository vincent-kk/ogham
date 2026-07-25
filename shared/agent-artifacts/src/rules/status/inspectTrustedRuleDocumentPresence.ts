import type {
  RuleDocumentManagerOptions,
  RuleDocumentPresence,
  RuleDocumentSelector,
} from "../../types/rules.js";
import { locateRuleDocumentPresence } from "../helpers/locateRuleDocumentPresence.js";

export type {
  RuleDocumentPresence,
  RuleDocumentSelector,
} from "../../types/rules.js";

/**
 * Read presence for tested owner/filename literals packaged with a plugin.
 * Runtime/user input must use inspectRuleDocumentPresence instead.
 */
export function inspectTrustedRuleDocumentPresence(
  options: RuleDocumentManagerOptions,
  selector: RuleDocumentSelector,
): RuleDocumentPresence {
  return locateRuleDocumentPresence(options, selector);
}
