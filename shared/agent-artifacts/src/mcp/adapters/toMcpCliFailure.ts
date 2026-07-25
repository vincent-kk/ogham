import type { McpCliRunResult, McpFailure } from "../../types/mcp.js";

export function toMcpCliFailure(result: McpCliRunResult): McpFailure | null {
  if (result.spawnError !== undefined) {
    const code = (result.spawnError as Error & { readonly code?: unknown })
      .code;
    return {
      kind: code === "ENOENT" ? "not-installed" : "spawn",
      code: result.code,
      stderr: result.stderr,
    };
  }
  if (result.timedOut)
    return {
      kind: "timeout",
      code: result.code,
      stderr: result.stderr,
    };

  if (result.code !== 0)
    return {
      kind: "exit",
      code: result.code,
      stderr: result.stderr,
    };

  return null;
}
