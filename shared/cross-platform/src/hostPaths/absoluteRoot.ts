import { isAbsolute } from "node:path";

import { portableResolve } from "../paths/index.js";

/**
 * A supplied workspace path must be absolute. A relative one would resolve against
 * the process cwd — off Claude, the plugin's own install directory — which is the
 * exact confusion this module exists to remove, so it is rejected rather than
 * quietly resolved.
 *
 * Canonicalisation goes through `portableResolve`, never native `path.resolve`: a
 * POSIX-style path keeps POSIX semantics and a Windows path keeps Windows semantics
 * whatever OS the server runs on. Consumers hash the result (`sha256(root)` is the
 * project identity in deilen, cennad and filid), and host-dependent `resolve()`
 * rewrote separators and prepended a drive on Windows only — so the same workspace
 * split into two projects across runners.
 */
export function toAbsoluteRoot(value: string): string | null {
  return isAbsolute(value) ? portableResolve(value) : null;
}

export function requireAbsoluteRoot(value: string): string {
  const root = toAbsoluteRoot(value);
  if (root === null)
    throw new Error(
      `"project_root" must be an absolute path; received "${value}". A relative path ` +
        `resolves against the plugin's install directory, not your workspace.`,
    );
  return root;
}
