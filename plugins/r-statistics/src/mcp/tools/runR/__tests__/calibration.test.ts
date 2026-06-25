import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { discoverRscript } from "../../../../core/index.js";
import { JobStatus } from "../../../../types/enums.js";
import { handleRunR } from "../runR.js";

// Statistical-accuracy calibration: run known datasets through real R (base
// `stats` only — no optional packages) and assert the computed statistic equals
// the analytically-known value. Guards the contract + execution path produce
// correct numbers, not just "a result".
const pluginRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);
const hasR = discoverRscript() !== null;

async function runValue(scriptCode: string): Promise<number> {
  const out = await handleRunR({ scriptCode, executionMode: "sync" });
  if (out.status !== JobStatus.Succeeded) {
    throw new Error(`R failed (${out.status}): ${out.result?.stderr.text ?? ""}`);
  }
  return Number.parseFloat(out.result!.stdout.text.trim());
}

describe.skipIf(!hasR)("statistical calibration (real R)", () => {
  beforeAll(() => {
    process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  });

  it("t_test — two-sample t-statistic equals -5", async () => {
    const t = await runValue(
      'a <- c(1,2,3,4,5); b <- c(6,7,8,9,10)\n' +
        'cat(sprintf("%.4f", t.test(a, b, var.equal = TRUE)$statistic))',
    );
    expect(t).toBeCloseTo(-5, 4);
  });

  it("pearson_correlation — perfect linear r equals 1", async () => {
    const r = await runValue(
      'cat(sprintf("%.4f", cor.test(1:5, c(2,4,6,8,10), method = "pearson")$estimate))',
    );
    expect(r).toBeCloseTo(1, 4);
  });

  it("linear_regression — recovers the true slope of 2", async () => {
    const slope = await runValue(
      'x <- 1:10; y <- 2 * x + 1\ncat(sprintf("%.4f", coef(lm(y ~ x))[["x"]]))',
    );
    expect(slope).toBeCloseTo(2, 4);
  });

  it("anova — known F statistic equals 25", async () => {
    const f = await runValue(
      'g <- factor(rep(c("a","b"), each = 5)); y <- 1:10\n' +
        'cat(sprintf("%.4f", summary(aov(y ~ g))[[1]][["F value"]][1]))',
    );
    expect(f).toBeCloseTo(25, 3);
  });

  it("mann_whitney — fully separated groups give W = 0", async () => {
    const w = await runValue(
      'cat(sprintf("%.1f", suppressWarnings(wilcox.test(1:5, 6:10)$statistic)))',
    );
    expect(w).toBeCloseTo(0, 5);
  });

  it("chi_square — uniform table gives X^2 = 0", async () => {
    const x2 = await runValue(
      'cat(sprintf("%.4f", suppressWarnings(chisq.test(matrix(c(10,10,10,10), 2))$statistic)))',
    );
    expect(x2).toBeCloseTo(0, 4);
  });
});
