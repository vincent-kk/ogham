import type { DirectoryRuleTarget } from "../../targets/index.js";
import type {
  ManagedRuleDocument,
  RuleDocumentInspection,
} from "../../types/rules.js";
import type { FileChange } from "../../transactions/index.js";
import type { RuleActionDecision } from "../types/internal.js";

export function buildDirectoryRuleChanges(
  target: DirectoryRuleTarget,
  document: ManagedRuleDocument,
  paths: readonly string[],
  inspection: RuleDocumentInspection,
  decision: RuleActionDecision,
  legacyDriftContent: Uint8Array | null,
): readonly FileChange[] {
  if (
    decision.action === "drift" &&
    inspection.source === "legacy" &&
    legacyDriftContent !== null
  )
    return [
      {
        targetPath: paths[0] as string,
        content: legacyDriftContent,
        root: target.root,
      },
      ...paths.slice(1).map((targetPath) => ({
        targetPath,
        content: null,
        root: target.root,
      })),
    ];

  if (
    (decision.action === "copy" ||
      decision.action === "update" ||
      decision.action === "relocate") &&
    document.content !== null
  )
    return [
      {
        targetPath: paths[0] as string,
        content: document.content,
        root: target.root,
      },
      ...(inspection.source === "legacy" || decision.action === "relocate"
        ? paths.slice(1).map((targetPath) => ({
            targetPath,
            content: null,
            root: target.root,
          }))
        : []),
    ];

  return decision.action === "remove"
    ? paths.map((targetPath) => ({
        targetPath,
        content: null,
        root: target.root,
      }))
    : [];
}
