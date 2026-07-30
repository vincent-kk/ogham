import { resolveContainedPath } from "@ogham/cross-platform";

import type { DirectoryRuleTarget } from "../../targets/index.js";
import { createRevision } from "../../transactions/index.js";
import type { DirectoryRulePlanningItem } from "../types/directoryPlanning.js";

export function planDirectoryRuleOrphan(
  target: DirectoryRuleTarget,
  filename: string,
): DirectoryRulePlanningItem {
  const orphanPath = resolveContainedPath(target.directoryPath, filename);
  try {
    const expectedRevision = createRevision([orphanPath]);
    return {
      outcome: {
        id: filename,
        action: "remove",
        target: orphanPath,
      },
      revision: { target: orphanPath, revision: expectedRevision },
      revisionSpec: {
        target: orphanPath,
        revisionPaths: [orphanPath],
      },
      filePlan: {
        expectedRevision,
        revisionPaths: [orphanPath],
        lockTarget: target.lockTarget,
        changes: [
          {
            targetPath: orphanPath,
            content: null,
            root: target.root,
          },
        ],
      },
    };
  } catch (error) {
    return {
      outcome: {
        id: filename,
        action: "skip",
        target: orphanPath,
        reason:
          error instanceof Error
            ? `cannot inspect owned orphan: ${error.message}`
            : "cannot inspect owned orphan",
      },
      revision: { target: orphanPath, revision: "" },
      revisionSpec: { target: orphanPath, revisionPaths: [] },
      filePlan: null,
    };
  }
}
