import type {
  ManagedRuleDocument,
  RuleDocumentInspection,
  RuleDocumentManagerOptions,
} from "../../types/rules.js";
import { inspectDirectoryRuleDocuments } from "./inspectDirectoryRuleDocuments.js";
import { inspectSectionRuleDocuments } from "./inspectSectionRuleDocuments.js";

export function inspectRuleDocuments(
  options: RuleDocumentManagerOptions,
  documents: readonly ManagedRuleDocument[],
): readonly RuleDocumentInspection[] {
  return options.target.kind === "directory"
    ? inspectDirectoryRuleDocuments(options.target, documents)
    : inspectSectionRuleDocuments(options.owner, options.target, documents);
}
