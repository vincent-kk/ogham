import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readWorkspace } from "./readWorkspace.mjs";

/**
 * Reads every workspace listed by the root manifest's `workspaces` globs and
 * narrows each dependency list to workspace packages.
 *
 * Only the `<dir>/*` glob form is supported, which is the only form this
 * repository uses; any other pattern throws so a new form cannot silently
 * drop workspaces from the CI plan. Test membership comes from the root
 * vitest config's `projects` list — the list `vitest run --project` selects
 * from — so a workspace vitest config that is not registered there is not
 * mistaken for a runnable project.
 *
 * @param {string} root Absolute repository root.
 * @returns {import("./readWorkspace.mjs").Workspace[]} Workspaces in manifest-glob order, then directory order.
 */
export function readWorkspaceGraph(root) {
  const rootManifest = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  const vitestProjects = readVitestProjects(root);
  const workspaces = rootManifest.workspaces.flatMap((pattern) =>
    listWorkspaceDirectories(root, pattern).map((dir) =>
      readWorkspace(root, dir, vitestProjects),
    ),
  );
  const names = new Set(workspaces.map((workspace) => workspace.name));
  return workspaces.map((workspace) => ({
    ...workspace,
    dependencies: workspace.dependencies.filter((name) => names.has(name)),
  }));
}

function listWorkspaceDirectories(root, pattern) {
  if (!/^[^*]+\/\*$/.test(pattern))
    throw new Error(`Unsupported workspace glob: ${pattern}`);
  const parent = pattern.slice(0, -2);
  return readdirSync(join(root, parent), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${parent}/${entry.name}`)
    .filter((dir) => existsSync(join(root, dir, "package.json")))
    .sort();
}

function readVitestProjects(root) {
  const source = readFileSync(join(root, "vitest.config.ts"), "utf8");
  const list = source.match(/projects:\s*\[([^\]]*)\]/)?.[1] ?? "";
  return new Set(
    [...list.matchAll(/["'](?:\.\/)?([^"']+)["']/g)].map((match) => match[1]),
  );
}
