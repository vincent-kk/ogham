#!/usr/bin/env node
/**
 * Workspace-wide build orchestrator.
 *
 * Same provider/consumer staging as scripts/typecheck-all.mjs:
 * providers emit dist first so consumer `tsc -p tsconfig.build.json`
 * can resolve their .d.ts files. Consumers run sequentially via
 * `yarn workspaces foreach --topological-dev` so package dependencies
 * such as @ogham/maencof -> @ogham/maencof-lens keep their build order.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// See scripts/typecheck-all.mjs for why only cross-platform emits dist
// while plugin packages ship via bridge/.
const PROVIDERS = [
  { name: "@ogham/cross-platform", dir: "shared/cross-platform" },
];

const EXCLUDES = PROVIDERS.map(({ name }) => `--exclude=${name}`);

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
    const child = spawn(cmd, args, { stdio: "inherit", cwd: root });
    child.on("exit", (code) => {
      if (code === 0) res();
      else rej(new Error(`${label} → exit ${code}`));
    });
  });
}

// 1. Build providers sequentially.
for (const { name, dir } of PROVIDERS) {
  console.log(`\n→ Building ${name} (provider)`);
  await clearTscCache(dir);
  await run("yarn", ["workspace", name, "build"], `${name} build`);
}

// 2. Build the rest via foreach with dependency ordering among consumers.
console.log(`\n→ Building remaining workspaces`);
await run(
  "yarn",
  [
    "workspaces",
    "foreach",
    "-A",
    "--topological-dev",
    ...EXCLUDES,
    "run",
    "build",
  ],
  "consumers build",
);

console.log("\n✓ All workspaces built");
