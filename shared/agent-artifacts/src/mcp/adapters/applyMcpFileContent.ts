import { applyFilePlan } from "../../transactions/index.js";
import type { McpServerApplyResult, McpServerPlan } from "../../types/mcp.js";
import type { FileMcpAdapterContext } from "./adapterTypes.js";

export function applyMcpFileContent(options: {
  readonly context: FileMcpAdapterContext;
  readonly plan: McpServerPlan;
  readonly content: string;
  readonly write: boolean;
}): McpServerApplyResult {
  const expectedRevision = options.plan.revisions.find(
    (entry) => entry.target === options.context.target.path,
  )?.revision;
  if (expectedRevision === undefined || expectedRevision === null)
    return {
      ok: false,
      outcomes: options.plan.outcomes.map((outcome) => ({
        ...outcome,
        action: "conflict",
        reason: "plan does not contain the target revision",
      })),
      revisions: options.plan.revisions,
      failure: { kind: "conflict", code: null, stderr: "" },
    };

  const applied = applyFilePlan({
    expectedRevision,
    revisionPaths: [options.context.target.path],
    lockTarget: options.context.target.lockTarget,
    changes: options.write
      ? [
          {
            targetPath: options.context.target.path,
            content: options.content,
            root: options.context.target.root,
          },
        ]
      : [],
  });
  if (applied.status === "conflict")
    return {
      ok: false,
      outcomes: options.plan.outcomes.map((outcome) => ({
        ...outcome,
        action: "conflict",
        reason:
          applied.reason === "lock"
            ? "MCP target lock is unavailable"
            : "MCP target revision changed",
      })),
      revisions: options.plan.revisions,
      failure: { kind: "conflict", code: null, stderr: "" },
    };

  return {
    ok: true,
    outcomes: options.plan.outcomes,
    revisions: options.plan.revisions,
  };
}
