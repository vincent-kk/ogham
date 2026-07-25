import type {
  RuleDocumentManagerOptions,
  RuleDocumentPresence,
  RuleDocumentSelector,
} from "../../types/rules.js";
import { requireArtifactOwner } from "../../validation/index.js";
import { locateRuleDocumentPresence } from "../helpers/locateRuleDocumentPresence.js";
import { validateRuleDocumentSelector } from "../helpers/validateRuleDocumentSelector.js";

export type {
  RuleDocumentPresence,
  RuleDocumentSelector,
} from "../../types/rules.js";

export function inspectRuleDocumentPresence(
  options: RuleDocumentManagerOptions,
  document: RuleDocumentSelector,
): RuleDocumentPresence {
  requireArtifactOwner(options.owner);
  validateRuleDocumentSelector(document);
  return locateRuleDocumentPresence(options, document);
}
