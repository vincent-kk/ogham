import { spawnCli } from "@ogham/cross-platform/spawn";

import type { McpCliRunResult } from "../../types/mcp.js";

export async function defaultMcpCliRunner(
  binary: string,
  args: readonly string[],
): Promise<McpCliRunResult> {
  return spawnCli(binary, args, {});
}
