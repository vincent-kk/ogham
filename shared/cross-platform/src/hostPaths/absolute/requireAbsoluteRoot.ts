import { toAbsoluteRoot } from "./toAbsoluteRoot.js";

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
