import type {
  ManagedRuleDocument,
  RuleDocumentInspection,
  RuleDocumentManagerOptions,
} from "../../types/rules.js";
import { requireArtifactOwner } from "../../validation/index.js";
import { validateRuleDocuments } from "../helpers/validateRuleDocuments.js";
import { inspectRuleDocuments } from "./inspectRuleDocuments.js";

export type {
  ManagedRuleDocument,
  RuleDocumentInspection,
  RuleDocumentManagerOptions,
} from "../../types/rules.js";

export function inspectRuleDocumentStatus(
  options: RuleDocumentManagerOptions,
  documents: readonly ManagedRuleDocument[],
): readonly RuleDocumentInspection[] {
  requireArtifactOwner(options.owner);
  validateRuleDocuments(documents);
  return inspectRuleDocuments(options, documents);
}
