import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/** Plugins whose committed bridge bundles and adapters must match a fresh build. */
const HOOK_PLUGINS = ["seiri", "cennad", "filid", "maencof", "maencof-lens"];

const ci = readFileSync(
  new URL("../../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

/**
 * Extract the quoted `paths` entries of one workflow trigger.
 * @param {string} trigger Trigger key under `on:`, such as `push`.
 * @returns {string[]} Path filters in file order; empty when the trigger is absent.
 */
function triggerPaths(trigger) {
  const afterOn = ci.slice(ci.indexOf("\non:\n") + "\non:\n".length);
  const on = afterOn.slice(0, afterOn.search(/^\S/m));
  const start = on.indexOf(`  ${trigger}:\n`);
  if (start < 0) return [];
  const block = on.slice(start).split(/\n {2}\S/)[0];
  return [...block.matchAll(/^\s+- "([^"]+)"$/gm)].map((match) => match[1]);
}

describe("CI committed artifact gate", () => {
  const job = ci.slice(ci.indexOf("\n  adapters:"), ci.indexOf("\n  ci:"));

  it("builds every hook plugin before comparing the committed tree", () => {
    const build = job.match(/run: node scripts\/buildAll\.mjs --only=(\S+)/);
    assert.ok(build, "adapters job runs buildAll with --only");
    const built = build[1].split(",");
    for (const plugin of HOOK_PLUGINS)
      assert.ok(built.includes(`@ogham/${plugin}`), `builds @ogham/${plugin}`);

    const committed = job.match(
      /git status --porcelain --untracked-files=all -- ([^)"]+)/,
    );
    assert.ok(committed, "adapters job checks the committed tree");
    assert.ok(committed.index > build.index);
    const checked = committed[1].trim().split(/\s+/);
    for (const plugin of HOOK_PLUGINS)
      assert.ok(
        checked.includes(`plugins/${plugin}`),
        `checks plugins/${plugin}`,
      );
  });

  it("triggers on every hook plugin directory for push and pull_request", () => {
    for (const trigger of ["push", "pull_request"]) {
      const paths = triggerPaths(trigger);
      for (const plugin of HOOK_PLUGINS)
        assert.ok(
          paths.includes(`plugins/${plugin}/**`),
          `${trigger} paths include plugins/${plugin}/**`,
        );
    }
  });
});
