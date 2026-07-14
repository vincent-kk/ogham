import { requireAbsoluteRoot, toAbsoluteRoot } from "./absoluteRoot.js";
import { detectHost } from "./detectHost.js";
import {
  readRememberedProjectRoot,
  rememberProjectRoot,
} from "./projectRootMemo.js";

/**
 * The user's workspace — what file operations, project identity and allow-roots must
 * be scoped to.
 *
 * On Claude this is `process.cwd()`, exactly as before: the host launches the MCP
 * server from the workspace and hands the plugin its own root through a separate env
 * var.
 *
 * Every other host has to be told. Codex spends the cwd slot on the plugin root (see
 * `pluginRoot`), gives the server no session env beyond `OGHAM_HOST`, and its MCP
 * client declares no `roots` capability — so the workspace cannot be recovered inside
 * the process. The model is the only party that knows both coordinates, which is why
 * project-scoped tools take an optional `project_root`.
 *
 * Returns null rather than guessing when nothing usable supplied it. Falling back to
 * `process.cwd()` off Claude would silently read user data out of the plugin's install
 * directory, hash the wrong project, and sweep the wrong cache. A non-absolute
 * `explicit` is treated as nothing supplied, never as a path to resolve.
 */
export function tryProjectRoot(explicit?: string): string | null {
  if (explicit !== undefined) {
    const supplied = toAbsoluteRoot(explicit);
    if (supplied === null) return null;
    rememberProjectRoot(supplied);
    return supplied;
  }
  if (detectHost() === "claude") return process.cwd();
  return readRememberedProjectRoot();
}

/**
 * `tryProjectRoot`, for callers that cannot proceed without a workspace. Both failures
 * are written for the model, since it is the party that can supply the path.
 */
export function projectRoot(explicit?: string): string {
  if (explicit !== undefined) {
    const supplied = requireAbsoluteRoot(explicit);
    rememberProjectRoot(supplied);
    return supplied;
  }

  const resolved = tryProjectRoot();
  if (resolved !== null) return resolved;

  throw new Error(
    `Cannot determine the project root on host "${detectHost()}". This MCP server runs ` +
      `from the plugin's install directory, so it cannot see your workspace. Retry the ` +
      `call with "project_root" set to the absolute path of the workspace directory.`,
  );
}
