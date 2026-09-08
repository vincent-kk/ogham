import { classifyChangedFile } from "./classifyChangedFile.mjs";
import { expandClosure } from "./expandClosure.mjs";

/**
 * @typedef {object} CiPlan
 * @property {"full" | "affected"} mode Whether every workspace runs or only the affected subset.
 * @property {string} reason Why this mode was chosen.
 * @property {string[]} changed Workspaces that own a changed file.
 * @property {string[]} affected `changed` plus every transitive dependent — the set whose test,
 *   typecheck and lint results can differ.
 * @property {string[]} build `affected` plus every transitive dependency that has a `build`
 *   script, so each affected workspace can resolve what it imports.
 * @property {string[]} dist The `build` entries under `shared/` — the packages whose
 *   `dist/` consumers resolve through package exports, which lint and typecheck need
 *   even without building the consumers themselves.
 * @property {string[]} test Affected workspaces that are vitest projects.
 * @property {string[]} typecheck Affected workspaces with a `typecheck` script.
 * @property {string[]} typecheckTests Affected workspaces with a `typecheck:tests` script.
 * @property {string[]} lint Directories to lint; `.` for a full run.
 * @property {boolean} scriptsTests Whether the root `scripts/__tests__` suite runs.
 */

/**
 * Turns a list of changed files into the subset of CI work whose result can
 * differ, expanded through the workspace dependency graph.
 *
 * @param {import("./readWorkspace.mjs").Workspace[]} workspaces Workspace graph in canonical order.
 * @param {string[]} changedFiles Repository-relative changed paths; ignored when `forceFull` is set.
 * @param {{ forceFull?: string }} [options] `forceFull` carries the reason for an unconditional full run.
 * @returns {CiPlan} The plan; list order follows `workspaces`.
 */
export function computeCiPlan(workspaces, changedFiles, options = {}) {
  if (options.forceFull) return fullPlan(workspaces, options.forceFull);
  const classes = changedFiles.map((path) =>
    classifyChangedFile(path, workspaces),
  );
  const fullTrigger = classes.find((entry) => entry.kind === "full");
  if (fullTrigger) return fullPlan(workspaces, fullTrigger.reason);
  const changed = new Set(
    classes.flatMap((entry) =>
      entry.kind === "workspace" ? [entry.name] : [],
    ),
  );
  return affectedPlan(workspaces, changed);
}

function fullPlan(workspaces, reason) {
  const names = workspaces.map((workspace) => workspace.name);
  return {
    mode: "full",
    reason,
    changed: names,
    affected: names,
    build: select(workspaces, names, "hasBuild"),
    dist: selectDist(workspaces, names),
    test: select(workspaces, names, "hasTests"),
    typecheck: select(workspaces, names, "hasTypecheck"),
    typecheckTests: select(workspaces, names, "hasTypecheckTests"),
    lint: ["."],
    scriptsTests: true,
  };
}

function affectedPlan(workspaces, changed) {
  const byName = new Map(
    workspaces.map((workspace) => [workspace.name, workspace]),
  );
  const dependents = (name) =>
    workspaces
      .filter((workspace) => workspace.dependencies.includes(name))
      .map((workspace) => workspace.name);
  const affected = expandClosure(changed, dependents);
  const build = expandClosure(
    affected,
    (name) => byName.get(name).dependencies,
  );
  const ordered = (names) =>
    workspaces.map((w) => w.name).filter((name) => names.has(name));
  return {
    mode: "affected",
    reason: changed.size
      ? `${changed.size} workspace(s) changed`
      : "no workspace changed",
    changed: ordered(changed),
    affected: ordered(affected),
    build: select(workspaces, ordered(build), "hasBuild"),
    dist: selectDist(workspaces, ordered(build)),
    test: select(workspaces, ordered(affected), "hasTests"),
    typecheck: select(workspaces, ordered(affected), "hasTypecheck"),
    typecheckTests: select(workspaces, ordered(affected), "hasTypecheckTests"),
    lint: ordered(affected).map((name) => byName.get(name).dir),
    scriptsTests: false,
  };
}

function select(workspaces, names, flag) {
  const chosen = new Set(names);
  return workspaces
    .filter((workspace) => chosen.has(workspace.name) && workspace[flag])
    .map((workspace) => workspace.name);
}

function selectDist(workspaces, names) {
  return select(workspaces, names, "hasBuild").filter((name) =>
    workspaces
      .find((workspace) => workspace.name === name)
      .dir.startsWith("shared/"),
  );
}
