import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkSeiriAdapters } from "../checkSeiriAdapters.mjs";
import {
  compileDistribution,
  distributionHashes,
} from "../prepareSeiriDistribution.mjs";
import { seiriDistributionFixture } from "./fixtures/seiriDistribution.mjs";

describe("checkSeiriAdapters", () => {
  it("checks real compiler determinism without touching checkout artifacts", (t) => {
    const f = seiriDistributionFixture(t);
    const before = distributionHashes(f.source);
    assert.ok(checkSeiriAdapters({ source: f.source }).files > 0);
    assert.deepEqual(distributionHashes(f.source), before);
  });

  it("fails when a second generation changes any emitted byte", (t) => {
    const f = seiriDistributionFixture(t);
    let count = 0;
    assert.throws(
      () =>
        checkSeiriAdapters({
          source: f.source,
          compile(output) {
            compileDistribution(output);
            if (++count === 2)
              writeFileSync(join(output, "nondeterministic.txt"), "changed");
          },
        }),
      /not deterministic/,
    );
  });

  it("orders the clean runtime build, committed-artifact gate, staging and other-plugin drift checks in CI", () => {
    const ci = readFileSync(
      new URL("../../.github/workflows/ci.yml", import.meta.url),
      "utf8",
    );
    const job = ci.slice(ci.indexOf("\n  adapters:"), ci.indexOf("\n  ci:"));
    const build = job.indexOf(
      "node scripts/buildAll.mjs --only=@ogham/cross-platform,@ogham/agent-artifacts,@ogham/http-kit,@ogham/session-finalizer,@ogham/seiri",
    );
    const committed = job.indexOf(
      "git status --porcelain --untracked-files=all -- plugins/seiri",
    );
    const staging = job.indexOf("node scripts/checkSeiriAdapters.mjs");
    assert.ok(build >= 0 && committed > build && staging > committed);
    assert.ok(job.indexOf("yarn plugin:adapters:check") > staging);
  });
});
