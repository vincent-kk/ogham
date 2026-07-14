import { requireAbsoluteRoot } from "./absoluteRoot.js";
import { detectHost } from "./detectHost.js";

let remembered: string | null = null;

/**
 * Record the workspace a caller supplied, so later resolutions in the same process
 * can reuse it. One MCP server process serves one workspace, so this is that
 * process's project coordinate rather than a cache of a changing value.
 *
 * Ignored on Claude: there `process.cwd()` is already the workspace, and letting one
 * tool call's argument leak into unrelated ones would change today's behaviour.
 *
 * Use this to seed the memo from a handler whose workspace is consumed by a deep
 * leaf; it stays quiet when nothing was supplied, so an env override upstream of the
 * leaf still wins.
 */
export function rememberProjectRoot(explicit: string | undefined): void {
  if (explicit === undefined) return;
  const root = requireAbsoluteRoot(explicit);
  if (detectHost() === "claude") return;
  remembered = root;
}

export function readRememberedProjectRoot(): string | null {
  return remembered;
}

/** Test seam — clears the per-process memo. */
export function resetProjectRoot(): void {
  remembered = null;
}
