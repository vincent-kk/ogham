import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Edges the package manifests do not declare. Every plugin build runs the
 * plugin compiler (`build:compile-plugin`), so a compiler change alters every
 * plugin's adapters and bridge output.
 */
const IMPLICIT_DEPENDENCIES = [
  { consumerPrefix: "plugins/", provider: "@ogham/plugin-compiler" },
];

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

/**
 * Workspace names reach shell commands in CI (`--only=`, `--project`), so a
 * manifest name is accepted only in npm's own shape.
 */
const PACKAGE_NAME = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

/**
 * @typedef {object} Workspace
 * @property {string} name Package name from its manifest.
 * @property {string} dir Repository-relative directory, forward slashes, no trailing slash.
 * @property {string[]} dependencies Declared plus implicit dependency names, not yet
 *   narrowed to workspace packages — `readWorkspaceGraph` does that.
 * @property {boolean} hasBuild Whether the manifest declares a `build` script.
 * @property {boolean} hasTypecheck Whether the manifest declares a `typecheck` script.
 * @property {boolean} hasTypecheckTests Whether the manifest declares a `typecheck:tests` script.
 * @property {boolean} hasTests Whether the root vitest config lists the directory as a project.
 */

/**
 * Reads one workspace's manifest into the shape the CI plan consumes.
 *
 * @param {string} root Absolute repository root.
 * @param {string} dir Repository-relative workspace directory holding a `package.json`.
 * @param {Set<string>} vitestProjects Directories the root vitest config lists as projects.
 * @returns {Workspace} The workspace description.
 * @throws When the manifest name is not a plain npm package name.
 */
export function readWorkspace(root, dir, vitestProjects) {
  const manifest = JSON.parse(
    readFileSync(join(root, dir, "package.json"), "utf8"),
  );
  if (!PACKAGE_NAME.test(manifest.name))
    throw new Error(
      `Refusing workspace name ${JSON.stringify(manifest.name)} in ${dir}`,
    );
  const declared = DEPENDENCY_FIELDS.flatMap((field) =>
    Object.keys(manifest[field] ?? {}),
  );
  const implicit = IMPLICIT_DEPENDENCIES.filter(({ consumerPrefix }) =>
    dir.startsWith(consumerPrefix),
  ).map(({ provider }) => provider);
  return {
    name: manifest.name,
    dir,
    dependencies: [...new Set([...declared, ...implicit])].filter(
      (name) => name !== manifest.name,
    ),
    hasBuild: Boolean(manifest.scripts?.build),
    hasTypecheck: Boolean(manifest.scripts?.typecheck),
    hasTypecheckTests: Boolean(manifest.scripts?.["typecheck:tests"]),
    hasTests: vitestProjects.has(dir),
  };
}
