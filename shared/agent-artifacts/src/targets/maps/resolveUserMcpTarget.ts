import type { CliMcpTarget, UserTargetOptions } from "../types/targetTypes.js";

export function resolveUserMcpTarget(options: UserTargetOptions): CliMcpTarget {
  if (options.host === "claude")
    return { kind: "cli", command: "claude", scope: "user" };

  if (options.host === "codex")
    return { kind: "cli", command: "codex", scope: "user" };

  throw new Error(`Unsupported artifact host: ${String(options.host)}`);
}
