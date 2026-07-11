/**
 * Plugin install layout — the Claude-Code component/runtime set, independent of
 * the npm `files` array (which is for npm publish and can omit installed dirs
 * like `agents/`).
 */

/** Verbatim runtime/doc entries copied into every target. */
export const ASSET_ENTRIES = [
  "bridge",
  "libs",
  "README.md",
  "public",
  "templates",
] as const;

/**
 * Everything a Claude install contains — generated components plus runtime
 * assets. Used to build the equivalence-gate oracle from the current tree.
 */
export const CLAUDE_INSTALL_ENTRIES = [
  ".claude-plugin",
  ".mcp.json",
  "skills",
  "agents",
  "hooks",
  ...ASSET_ENTRIES,
] as const;
