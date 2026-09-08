/**
 * Root-level inputs every workspace's build, test, typecheck or lint result
 * depends on. A change here invalidates the whole tree.
 */
const FULL_RUN_TRIGGERS = [
  /^package\.json$/,
  /^yarn\.lock$/,
  /^\.yarnrc\.yml$/,
  /^\.yarn\//,
  /^tsconfig\.base\.json$/,
  /^eslint\.config\.mjs$/,
  /^vitest\.config\.ts$/,
  /^\.github\//,
  /^scripts\//,
];

/**
 * Root-level paths no CI step reads. Anything else outside a workspace is an
 * unknown input and forces a full run rather than being guessed at.
 */
const IGNORED_OUTSIDE_WORKSPACES = [
  /\.md$/,
  /^LICENSE$/,
  /^\.gitignore$/,
  /^\.gitattributes$/,
  /^\.editorconfig$/,
  /^\.prettierrc/,
  /^\.prettierignore$/,
  /^cspell\.json$/,
  /^backup\//,
  /^\.claude\//,
  /^\.vscode\//,
  /^\.idea\//,
];

/**
 * @typedef {{ kind: "workspace", name: string } | { kind: "full", reason: string } | { kind: "ignored" }} FileClass
 */

/**
 * Decides what one changed path means for the CI plan.
 *
 * @param {string} path Repository-relative path with forward slashes.
 * @param {import("./readWorkspace.mjs").Workspace[]} workspaces Workspace graph.
 * @returns {FileClass} The owning workspace, a full-run trigger with its reason, or an ignored path.
 */
export function classifyChangedFile(path, workspaces) {
  const owner = workspaces.find((workspace) =>
    path.startsWith(`${workspace.dir}/`),
  );
  if (owner) return { kind: "workspace", name: owner.name };
  if (FULL_RUN_TRIGGERS.some((pattern) => pattern.test(path)))
    return { kind: "full", reason: `root input changed: ${path}` };
  if (IGNORED_OUTSIDE_WORKSPACES.some((pattern) => pattern.test(path)))
    return { kind: "ignored" };
  return { kind: "full", reason: `unmapped path changed: ${path}` };
}
