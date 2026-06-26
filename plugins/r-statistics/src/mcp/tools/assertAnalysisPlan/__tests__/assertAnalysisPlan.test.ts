import { describe, expect, it } from "vitest";

import { McpToolName } from "../../../../constants/mcpToolNames.js";

import {
  AssertSeverity,
  AssumptionId,
  ExecutionMode,
  MethodFamily,
  OutcomeType,
} from "../../../../types/enums.js";
import type { AssertInput } from "../../../../types/assert.js";
import { handleAssertAnalysisPlan } from "../assertAnalysisPlan.js";

function plan(overrides: Partial<AssertInput> = {}): AssertInput {
  return {
    method: { technique: "t_test", family: MethodFamily.Parametric },
    datasetMeta: {
      outcomeType: OutcomeType.Continuous,
      groupCount: 2,
      sampleSize: 40,
    },
    mode: ExecutionMode.Interactive,
    ...overrides,
  };
}

describe(McpToolName.ASSERT_ANALYSIS_PLAN, () => {
  it("passes a clean parametric plan with satisfied assumptions", async () => {
    const out = await handleAssertAnalysisPlan(
      plan({
        assumptionArtifacts: [
          {
            assumptionId: AssumptionId.Normality,
            artifactPath: "n",
            passed: true,
          },
          {
            assumptionId: AssumptionId.Homogeneity,
            artifactPath: "h",
            passed: true,
          },
        ],
      }),
    );
    expect(out.allowed).toBe(true);
    expect(out.severity).toBe(AssertSeverity.Ok);
    expect(out.reasons).toHaveLength(0);
  });

  it("hard-blocks an outcome/method mismatch in both modes", async () => {
    for (const mode of [ExecutionMode.Interactive, ExecutionMode.Auto]) {
      const out = await handleAssertAnalysisPlan(
        plan({
          method: { technique: "chi_square", family: MethodFamily.Categorical },
          datasetMeta: { outcomeType: OutcomeType.Continuous },
          mode,
        }),
      );
      expect(out.allowed).toBe(false);
      expect(out.severity).toBe(AssertSeverity.HardBlock);
      expect(out.reasons.map((r) => r.code)).toContain(
        "OUTCOME_METHOD_MISMATCH",
      );
    }
  });

  it("warns but allows a soft violation in interactive mode", async () => {
    const out = await handleAssertAnalysisPlan(
      plan({
        assumptionArtifacts: [
          {
            assumptionId: AssumptionId.Normality,
            artifactPath: "n",
            passed: false,
          },
          {
            assumptionId: AssumptionId.Homogeneity,
            artifactPath: "h",
            passed: true,
          },
        ],
      }),
    );
    expect(out.allowed).toBe(true);
    expect(out.severity).toBe(AssertSeverity.SoftWarning);
    expect(out.recommendedAlternatives).toContain("mann_whitney");
  });

  it("blocks the same soft violation in auto mode", async () => {
    const out = await handleAssertAnalysisPlan(
      plan({
        mode: ExecutionMode.Auto,
        assumptionArtifacts: [
          {
            assumptionId: AssumptionId.Normality,
            artifactPath: "n",
            passed: false,
          },
          {
            assumptionId: AssumptionId.Homogeneity,
            artifactPath: "h",
            passed: true,
          },
        ],
      }),
    );
    expect(out.allowed).toBe(false);
    expect(out.severity).toBe(AssertSeverity.SoftWarning);
  });

  it("treats a missing assumption artifact as an unverified soft warning", async () => {
    const out = await handleAssertAnalysisPlan(plan());
    expect(out.severity).toBe(AssertSeverity.SoftWarning);
    expect(out.reasons.map((r) => r.code)).toContain("normality_unverified");
    expect(out.allowed).toBe(true);
  });

  it("hard-blocks when per-group sample size is below 2", async () => {
    const out = await handleAssertAnalysisPlan(
      plan({
        datasetMeta: {
          outcomeType: OutcomeType.Continuous,
          groupCount: 2,
          sampleSize: 3,
        },
      }),
    );
    expect(out.severity).toBe(AssertSeverity.HardBlock);
    expect(out.reasons.map((r) => r.code)).toContain("SAMPLE_TOO_SMALL");
  });

  it("hard-blocks a Cox model with severely low EPV (survival family)", async () => {
    const out = await handleAssertAnalysisPlan(
      plan({
        method: { technique: "cox_model", family: MethodFamily.Survival },
        datasetMeta: {
          outcomeType: OutcomeType.TimeToEvent,
          eventsPerVariable: 3,
        },
      }),
    );
    expect(out.severity).toBe(AssertSeverity.HardBlock);
    expect(out.reasons.map((r) => r.code)).toContain("SAMPLE_TOO_SMALL");
  });

  it("hard-blocks chi-square with low expected counts", async () => {
    const out = await handleAssertAnalysisPlan(
      plan({
        method: { technique: "chi_square", family: MethodFamily.Categorical },
        datasetMeta: {
          outcomeType: OutcomeType.Categorical,
          expectedCountsBelow5: true,
        },
      }),
    );
    expect(out.severity).toBe(AssertSeverity.HardBlock);
    expect(out.reasons.map((r) => r.code)).toContain("EXPECTED_COUNT_LOW");
  });

  it("hard-blocks logistic regression with severely low EPV", async () => {
    const out = await handleAssertAnalysisPlan(
      plan({
        method: {
          technique: "logistic_regression",
          family: MethodFamily.Regression,
        },
        datasetMeta: { outcomeType: OutcomeType.Binary, eventsPerVariable: 3 },
      }),
    );
    expect(out.severity).toBe(AssertSeverity.HardBlock);
    expect(out.reasons.map((r) => r.code)).toContain("SAMPLE_TOO_SMALL");
    expect(out.reasons.at(0)?.message).toContain("Peduzzi et al. 1996");
    expect(out.reasons.at(0)?.message).toContain(
      "clinical prediction-model practice",
    );
    expect(out.reasons.at(0)?.message).toContain(
      "may be conservative outside that context",
    );
  });

  it("recommends negative_binomial when poisson overdispersion is detected", async () => {
    const out = await handleAssertAnalysisPlan(
      plan({
        method: {
          technique: "poisson_regression",
          family: MethodFamily.Regression,
        },
        datasetMeta: { outcomeType: OutcomeType.Count },
        assumptionArtifacts: [
          {
            assumptionId: AssumptionId.MeanEqualsVariance,
            artifactPath: "d",
            passed: false,
          },
        ],
      }),
    );
    expect(out.severity).toBe(AssertSeverity.SoftWarning);
    expect(out.recommendedAlternatives).toContain("negative_binomial");
  });

  it("soft-warns an unregistered technique in both modes", async () => {
    for (const mode of [ExecutionMode.Interactive, ExecutionMode.Auto]) {
      const out = await handleAssertAnalysisPlan(
        plan({
          method: {
            technique: "bootstrap_ci",
            family: MethodFamily.Nonparametric,
          },
          datasetMeta: { outcomeType: OutcomeType.Continuous },
          mode,
        }),
      );
      expect(out.severity).toBe(AssertSeverity.SoftWarning);
      expect(out.reasons.map((r) => r.code)).toContain(
        "unregistered_technique",
      );
      expect(out.allowed).toBe(mode === ExecutionMode.Interactive);
    }
  });

  it("now gates a registered gam with violated assumptions (was silently ok)", async () => {
    const out = await handleAssertAnalysisPlan(
      plan({
        method: { technique: "gam", family: MethodFamily.Regression },
        datasetMeta: { outcomeType: OutcomeType.Continuous },
        assumptionArtifacts: [
          {
            assumptionId: AssumptionId.ResidualNormality,
            artifactPath: "r",
            passed: false,
          },
          {
            assumptionId: AssumptionId.Homoscedasticity,
            artifactPath: "h",
            passed: false,
          },
        ],
      }),
    );
    expect(out.severity).toBe(AssertSeverity.SoftWarning);
    expect(out.reasons.map((r) => r.code)).toContain(
      "residual_normality_violated",
    );
    expect(out.reasons.map((r) => r.code)).toContain(
      "homoscedasticity_violated",
    );
  });

  it.each([
    ["gam", MethodFamily.Regression, OutcomeType.TimeToEvent],
    ["spline_regression", MethodFamily.Regression, OutcomeType.Categorical],
    ["ancova", MethodFamily.Regression, OutcomeType.Binary],
    ["cmh", MethodFamily.Categorical, OutcomeType.Continuous],
  ] as const)(
    "hard-blocks %s on an incompatible outcome type",
    async (technique, family, outcomeType) => {
      const out = await handleAssertAnalysisPlan(
        plan({
          method: { technique, family },
          datasetMeta: { outcomeType },
          mode: ExecutionMode.Auto,
        }),
      );
      expect(out.severity).toBe(AssertSeverity.HardBlock);
      expect(out.reasons.map((r) => r.code)).toContain(
        "OUTCOME_METHOD_MISMATCH",
      );
    },
  );
});
