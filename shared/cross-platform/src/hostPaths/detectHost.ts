import type { Host } from "./types.js";

const KNOWN_HOSTS = new Set<Host>(["claude", "codex", "agy"]);

/**
 * The host that launched this process, from the `OGHAM_HOST` marker the
 * non-Claude adapters inject into their MCP declaration.
 *
 * Absence means Claude: its `.mcp.json` is shipped unmodified, so it carries no
 * marker. An unrecognised marker resolves to `unknown` rather than defaulting to
 * Claude — assuming the Claude contract on a host that does not honour it is the
 * silent misbehaviour this module exists to prevent.
 */
export function detectHost(): Host {
  const raw = process.env.OGHAM_HOST;
  if (!raw) return "claude";
  return KNOWN_HOSTS.has(raw as Host) ? (raw as Host) : "unknown";
}
