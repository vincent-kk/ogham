import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

import { portableResolve } from "../paths/index.js";

/**
 * A supplied workspace path must be absolute. A relative one would resolve against
 * the process cwd — off Claude, the plugin's own install directory — which is the
 * exact confusion this module exists to remove, so it is rejected rather than
 * quietly resolved.
 *
 * A leading `~` is expanded first. The model fills this argument from what its host
 * showed it, and the Codex TUI names the workspace `~/Workspace/app`; rejecting that
 * spelling would leave the model retrying a path it has no expanded form of. `~user`
 * is not expandable from Node — only a shell can read it out of the passwd database —
 * so it stays rejected.
 *
 * The absolute form is canonicalised through `portableResolve`, never native
 * `path.resolve`: a POSIX-style path keeps POSIX semantics and a Windows path keeps
 * Windows semantics whatever OS the server runs on. Consumers hash the result
 * (`sha256(root)` is the project identity in deilen, cennad and filid), and
 * host-dependent `resolve()` rewrote separators and prepended a drive on Windows
 * only — so two spellings of the same directory split into two projects across runners.
 */
export function toAbsoluteRoot(value: string): string | null {
  const expanded = expandHome(value);
  if (expanded === null) return null;
  return isAbsolute(expanded) ? portableResolve(expanded) : null;
}

export function requireAbsoluteRoot(value: string): string {
  const root = toAbsoluteRoot(value);
  if (root === null)
    throw new Error(
      `"project_root" must be an absolute path; received "${value}". A leading "~" is ` +
        `expanded for you, but "~user" is not. A relative path resolves against the ` +
        `plugin's install directory, not your workspace.`,
    );
  return root;
}

/** `null` for the `~user` form, which only a shell can resolve. */
function expandHome(value: string): string | null {
  if (!value.startsWith("~")) return value;
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return join(homedir(), value.slice(2));
  // Windows spells the same thing with a backslash. On POSIX a backslash is an
  // ordinary filename character, so `~\x` there is a literal name, not a home ref.
  if (process.platform === "win32" && value.startsWith("~\\"))
    return join(homedir(), value.slice(2));
  return null;
}
