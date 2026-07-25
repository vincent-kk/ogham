import { requireAbsoluteRoot } from "@ogham/cross-platform/host-paths/absolute-root";
import { resolveContainedPath } from "@ogham/cross-platform/paths/contained";

import type {
  FileMcpTarget,
  ProjectTargetOptions,
} from "../types/targetTypes.js";

export function resolveProjectMcpTarget(
  options: ProjectTargetOptions,
): FileMcpTarget {
  const root = requireAbsoluteRoot(options.projectRoot);
  if (options.host === "claude") {
    const path = resolveContainedPath(root, ".mcp.json");
    return { kind: "json-file", root, path, lockTarget: path };
  }
  if (options.host === "codex") {
    const path = resolveContainedPath(root, ".codex", "config.toml");
    return { kind: "toml-file", root, path, lockTarget: path };
  }
  throw new Error(`Unsupported artifact host: ${String(options.host)}`);
}
