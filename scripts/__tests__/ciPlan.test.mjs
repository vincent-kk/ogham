import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { classifyChangedFile } from "../ciPlan/classifyChangedFile.mjs";
import { computeCiPlan } from "../ciPlan/computeCiPlan.mjs";
import { readWorkspaceGraph } from "../ciPlan/readWorkspaceGraph.mjs";

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/**
 * Miniature of the real graph: two providers, a plugin chain that ends in a
 * plugin depending on another plugin, a compiler every plugin implicitly
 * uses, and a docs-only plugin with no tests or typecheck.
 */
const workspace = (name, dir, dependencies, flags = {}) => ({
  name,
  dir,
  dependencies,
  hasBuild: true,
  hasTypecheck: true,
  hasTypecheckTests: false,
  hasTests: true,
  ...flags,
});

const GRAPH = [
  workspace("@ogham/cross-platform", "shared/cross-platform", []),
  workspace("@ogham/http-kit", "shared/http-kit", []),
  workspace("@ogham/maencof", "plugins/maencof", [
    "@ogham/cross-platform",
    "@ogham/plugin-compiler",
  ]),
  workspace("@ogham/maencof-lens", "plugins/maencof-lens", [
    "@ogham/maencof",
    "@ogham/plugin-compiler",
  ]),
  workspace(
    "@ogham/cennad",
    "plugins/cennad",
    ["@ogham/cross-platform", "@ogham/http-kit", "@ogham/plugin-compiler"],
    { hasTypecheckTests: true },
  ),
  workspace("@ogham/prawf", "plugins/prawf", ["@ogham/plugin-compiler"], {
    hasTests: false,
    hasTypecheck: false,
  }),
  workspace("@ogham/plugin-compiler", "tools/plugin-compiler", [], {
    hasBuild: false,
  }),
];

describe("classifyChangedFile", () => {
  it("maps a path inside a workspace to that workspace", () => {
    assert.deepEqual(
      classifyChangedFile("plugins/maencof/skills/x/SKILL.md", GRAPH),
      { kind: "workspace", name: "@ogham/maencof" },
    );
  });

  it("does not match a workspace by directory prefix alone", () => {
    assert.deepEqual(
      classifyChangedFile("plugins/maencof-lens/src/index.ts", GRAPH),
      { kind: "workspace", name: "@ogham/maencof-lens" },
    );
  });

  it("forces a full run for root inputs and unmapped paths", () => {
    assert.equal(classifyChangedFile("yarn.lock", GRAPH).kind, "full");
    assert.equal(
      classifyChangedFile("scripts/buildAll.mjs", GRAPH).kind,
      "full",
    );
    assert.equal(
      classifyChangedFile(".github/workflows/ci.yml", GRAPH).kind,
      "full",
    );
    assert.equal(classifyChangedFile("newdir/thing.ts", GRAPH).kind, "full");
  });

  it("ignores documentation outside workspaces", () => {
    assert.deepEqual(classifyChangedFile("README.md", GRAPH), {
      kind: "ignored",
    });
    assert.deepEqual(classifyChangedFile("backup/old.json", GRAPH), {
      kind: "ignored",
    });
  });
});

describe("computeCiPlan", () => {
  it("expands dependents for test and dependencies for build", () => {
    const plan = computeCiPlan(GRAPH, ["plugins/maencof/src/index.ts"]);
    assert.equal(plan.mode, "affected");
    assert.deepEqual(plan.changed, ["@ogham/maencof"]);
    assert.deepEqual(plan.affected, ["@ogham/maencof", "@ogham/maencof-lens"]);
    assert.deepEqual(plan.build, [
      "@ogham/cross-platform",
      "@ogham/maencof",
      "@ogham/maencof-lens",
    ]);
    assert.deepEqual(plan.dist, ["@ogham/cross-platform"]);
    assert.deepEqual(plan.test, ["@ogham/maencof", "@ogham/maencof-lens"]);
    assert.deepEqual(plan.lint, ["plugins/maencof", "plugins/maencof-lens"]);
    assert.equal(plan.scriptsTests, false);
  });

  it("reaches every plugin through the implicit compiler edge", () => {
    const plan = computeCiPlan(GRAPH, ["tools/plugin-compiler/src/main.ts"]);
    assert.deepEqual(plan.affected, [
      "@ogham/maencof",
      "@ogham/maencof-lens",
      "@ogham/cennad",
      "@ogham/prawf",
      "@ogham/plugin-compiler",
    ]);
    assert.ok(!plan.build.includes("@ogham/plugin-compiler"));
    assert.ok(plan.build.includes("@ogham/prawf"));
    assert.ok(!plan.test.includes("@ogham/prawf"));
    assert.deepEqual(plan.typecheckTests, ["@ogham/cennad"]);
  });

  it("plans a provider change down to every consumer", () => {
    const plan = computeCiPlan(GRAPH, ["shared/http-kit/src/index.ts"]);
    assert.deepEqual(plan.affected, ["@ogham/http-kit", "@ogham/cennad"]);
    assert.deepEqual(plan.build, [
      "@ogham/cross-platform",
      "@ogham/http-kit",
      "@ogham/cennad",
    ]);
  });

  it("yields an empty plan when only ignored paths changed", () => {
    const plan = computeCiPlan(GRAPH, ["README.md"]);
    assert.equal(plan.mode, "affected");
    assert.deepEqual(plan.build, []);
    assert.deepEqual(plan.test, []);
    assert.deepEqual(plan.lint, []);
  });

  it("switches to a full plan on a root input or an explicit request", () => {
    const byFile = computeCiPlan(GRAPH, [
      "plugins/cennad/src/a.ts",
      "package.json",
    ]);
    assert.equal(byFile.mode, "full");
    assert.match(byFile.reason, /package\.json/);
    assert.deepEqual(byFile.lint, ["."]);
    assert.equal(byFile.scriptsTests, true);
    assert.ok(!byFile.build.includes("@ogham/plugin-compiler"));
    assert.ok(!byFile.test.includes("@ogham/prawf"));

    const forced = computeCiPlan(GRAPH, [], { forceFull: "label" });
    assert.equal(forced.mode, "full");
    assert.equal(forced.reason, "label");
  });
});

describe("readWorkspaceGraph (this repository)", () => {
  const graph = readWorkspaceGraph(REPOSITORY_ROOT);

  it("registers every workspace vitest config as a root vitest project", () => {
    // `vitest run --project <name>` silently ignores an unregistered name, so a
    // workspace with tests that the root config does not list would never run.
    const unregistered = graph
      .filter((workspace) => !workspace.hasTests)
      .filter((workspace) =>
        existsSync(join(REPOSITORY_ROOT, workspace.dir, "vitest.config.ts")),
      )
      .map((workspace) => workspace.dir);
    assert.deepEqual(unregistered, []);
  });

  it("gives every plugin the implicit compiler edge", () => {
    const missing = graph
      .filter((workspace) => workspace.dir.startsWith("plugins/"))
      .filter((w) => !w.dependencies.includes("@ogham/plugin-compiler"))
      .map((workspace) => workspace.name);
    assert.deepEqual(missing, []);
  });
});
