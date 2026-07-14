import { isAbsolute, resolve } from "node:path";

/**
 * A supplied workspace path must be absolute. A relative one would resolve against
 * the process cwd — off Claude, the plugin's own install directory — which is the
 * exact confusion this module exists to remove, so it is rejected rather than
 * quietly resolved.
 *
 * The absolute form is canonicalised because consumers hash it (`sha256(root)` is
 * the project identity in deilen and cennad); two spellings of the same directory
 * must not produce two projects.
 */
export function toAbsoluteRoot(value: string): string | null {
  return isAbsolute(value) ? resolve(value) : null;
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
