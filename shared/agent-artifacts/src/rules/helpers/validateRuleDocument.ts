import type { ManagedRuleDocument } from "../../types/rules.js";
import { hasAsciiControlCharacter } from "../../validation/index.js";
import { validateRuleDocumentSelector } from "./validateRuleDocumentSelector.js";

export function validateRuleDocument(document: ManagedRuleDocument): void {
  if (document.id.length === 0 || hasAsciiControlCharacter(document.id, "all"))
    throw new Error(`Invalid rule document id: "${document.id}"`);
  validateRuleDocumentSelector(document);
}
