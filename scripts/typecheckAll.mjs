#!/usr/bin/env node
/**
 * Workspace-wide typecheck orchestrator.
 *
 * Why this is not a plain `yarn workspaces foreach -A run typecheck`:
 *
 * Consumer workspaces import from shared providers via their compiled
 * .d.ts output under `dist/`. A naive parallel typecheck fails on a
 * fresh checkout (and CI) because providers have no dist yet, so
 * `Cannot find module '@ogham/<provider>'` shows up everywhere.
 *
 *   PROVIDERS  — built first to emit .d.ts under dist/.
 *   CONSUMERS  — typechecked in parallel afterwards, together with the
 *                providers' own `typecheck` (their build runs
 *                tsconfig.build.json, which excludes their spec files).
 *
 * Each provider build runs `yarn clean` (which already removes its
 * dist + tsbuildinfo if the package's clean script does so) before
 * `tsc -p tsconfig.build.json`. For packages whose `clean` only
 * removes bridge/ (not dist/), we additionally clear the stale
 * tsbuildinfo so tsc actually re-emits dist instead of short-
 * circuiting on the incremental cache.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Shared providers emit dist because consumers resolve their package
// exports. Plugin packages intentionally skip dist emission because
// they ship via bridge/ (esbuild runtime). Keep agent-artifacts after
// cross-platform so the provider dependency graph remains ordered.
const PROVIDERS = [
  { name: "@ogham/cross-platform", dir: "shared/cross-platform" },
  { name: "@ogham/agent-artifacts", dir: "shared/agent-artifacts" },
  { name: "@ogham/http-kit", dir: "shared/http-kit" },
  { name: "@ogham/session-finalizer", dir: "shared/session-finalizer" },
];

// @ogham/prawf is a pure-markdown plugin (no TypeScript) and is
// intentionally absent — it has no `typecheck` script to run.
const CONSUMERS = [
  "@ogham/cennad",
  "@ogham/deilen",
  "@ogham/entrez",
  "@ogham/maencof",
  "@ogham/maencof-lens",
  "@ogham/filid",
  "@ogham/imbas",
  "@ogham/atlassian",
  "@ogham/seiri",
  "@ogham/plugin-compiler",
];

async function clearTscCache(pkgDir) {
  for (const f of [
    "dist",
    "tsconfig.tsbuildinfo",
    "tsconfig.build.tsbuildinfo",
  ]) {
    const target = resolve(root, pkgDir, f);
    if (existsSync(target)) await rm(target, { recursive: true, force: true });
  }
}

function run(cmd, args, label) {
  return new Promise((res, rej) => {
    // shell:true so Windows resolves yarn.cmd via PATHEXT. The cmd+args
    // here are constants in this repo, so no injection surface.
    const child = spawn(cmd, args, {
      stdio: "inherit",
      cwd: root,
      shell: true,
    });
    child.on("exit", (code) => {
      if (code === 0) res();
      else rej(new Error(`${label} → exit ${code}`));
    });
  });
}

// 1. Build providers sequentially so their dist is fresh.
for (const { name, dir } of PROVIDERS) {
  console.log(`\n→ Building ${name} (provider)`);
  await clearTscCache(dir);
  await run("yarn", ["workspace", name, "build"], `${name} build`);
}

// 2. Typecheck consumers and providers in parallel.
//
// A provider's build runs tsconfig.build.json, which excludes its spec files,
// so the provider's own `typecheck` is the only pass that covers them.
const TYPECHECK_TARGETS = [...PROVIDERS.map(({ name }) => name), ...CONSUMERS];
console.log(
  `\n→ Typechecking ${TYPECHECK_TARGETS.length} workspaces in parallel`,
);
await Promise.all(
  TYPECHECK_TARGETS.map((name) =>
    run("yarn", ["workspace", name, "typecheck"], `${name} typecheck`),
  ),
);

console.log("\n✓ All workspaces typecheck clean");
