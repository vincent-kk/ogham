import {
  AssumptionId,
  MethodFamily,
  OutcomeType,
  Severity,
} from "../../../../types/enums.js";
import type { MethodAssumption } from "../../../../types/assert.js";

/**
 * The deterministic technique ruleset evaluated by the gate. It mirrors
 * assert-rules.md and the per-technique methods/{technique}/meta.yaml files
 * (which carry the same declarations for the statistician agent). This TS copy
 * is the runtime authority so the execution layer stays dependency-free and
 * fully deterministic; keep it in sync with the meta.yaml catalog.
 */
export interface TechniqueRule {
  family: MethodFamily;
  outcomeTypes: OutcomeType[];
  assumptions: MethodAssumption[];
}

const soft = (
  id: AssumptionId,
  check: string,
  recommend: string[] = [],
): MethodAssumption => ({ id, severity: Severity.Soft, check, recommend });

export const TECHNIQUE_RULES: Record<string, TechniqueRule> = {
  t_test: {
    family: MethodFamily.Parametric,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [
      soft(AssumptionId.Normality, "shapiro", ["mann_whitney"]),
      soft(AssumptionId.Homogeneity, "levene", ["welch_t_test"]),
    ],
  },
  welch_t_test: {
    family: MethodFamily.Parametric,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [soft(AssumptionId.Normality, "shapiro", ["mann_whitney"])],
  },
  paired_t: {
    family: MethodFamily.Parametric,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [
      soft(AssumptionId.NormalityOfDiff, "shapiro", ["wilcoxon_signed_rank"]),
    ],
  },
  anova: {
    family: MethodFamily.Parametric,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [
      soft(AssumptionId.ResidualNormality, "shapiro", ["kruskal_wallis"]),
      soft(AssumptionId.Homogeneity, "levene", ["welch_anova"]),
    ],
  },
  welch_anova: {
    family: MethodFamily.Parametric,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [
      soft(AssumptionId.ResidualNormality, "shapiro", ["kruskal_wallis"]),
    ],
  },
  mann_whitney: {
    family: MethodFamily.Nonparametric,
    outcomeTypes: [OutcomeType.Continuous, OutcomeType.Categorical],
    assumptions: [soft(AssumptionId.Independence, "design")],
  },
  wilcoxon: {
    family: MethodFamily.Nonparametric,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [soft(AssumptionId.Independence, "design")],
  },
  wilcoxon_signed_rank: {
    family: MethodFamily.Nonparametric,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [soft(AssumptionId.Independence, "design")],
  },
  kruskal_wallis: {
    family: MethodFamily.Nonparametric,
    outcomeTypes: [OutcomeType.Continuous, OutcomeType.Categorical],
    assumptions: [soft(AssumptionId.Independence, "design")],
  },
  linear_regression: {
    family: MethodFamily.Regression,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [
      soft(AssumptionId.Linearity, "residual_plot"),
      soft(AssumptionId.ResidualNormality, "shapiro"),
      soft(AssumptionId.Homoscedasticity, "breusch_pagan"),
      soft(AssumptionId.Independence, "durbin_watson"),
      soft(AssumptionId.NoMulticollinearity, "vif"),
    ],
  },
  // EPV >= 10 follows the Peduzzi et al. 1996 clinical prediction-model
  // heuristic. It is retained as a soft disclosure check because it may be
  // conservative for general-purpose regression outside that origin context.
  logistic_regression: {
    family: MethodFamily.Regression,
    outcomeTypes: [OutcomeType.Binary],
    assumptions: [
      soft(AssumptionId.LogitLinearity, "box_tidwell"),
      soft(AssumptionId.NoMulticollinearity, "vif"),
      soft(AssumptionId.EpvGe10, "epv"),
    ],
  },
  poisson_regression: {
    family: MethodFamily.Regression,
    outcomeTypes: [OutcomeType.Count],
    assumptions: [
      soft(AssumptionId.MeanEqualsVariance, "dispersion", [
        "negative_binomial",
      ]),
    ],
  },
  negative_binomial: {
    family: MethodFamily.Regression,
    outcomeTypes: [OutcomeType.Count],
    assumptions: [soft(AssumptionId.NoMulticollinearity, "vif")],
  },
  mixed_model: {
    family: MethodFamily.Regression,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [
      soft(AssumptionId.ResidualNormality, "shapiro"),
      soft(AssumptionId.Homoscedasticity, "residual_plot"),
      soft(AssumptionId.NoMulticollinearity, "vif"),
    ],
  },
  cox_model: {
    family: MethodFamily.Survival,
    outcomeTypes: [OutcomeType.TimeToEvent],
    assumptions: [
      soft(AssumptionId.ProportionalHazards, "cox_zph"),
      soft(AssumptionId.Loglinearity, "martingale_residual"),
    ],
  },
  chi_square: {
    family: MethodFamily.Categorical,
    outcomeTypes: [OutcomeType.Categorical, OutcomeType.Binary],
    assumptions: [
      soft(AssumptionId.ExpectedCountGe5, "expected_counts", ["fisher_exact"]),
    ],
  },
  fisher_exact: {
    family: MethodFamily.Categorical,
    outcomeTypes: [OutcomeType.Categorical, OutcomeType.Binary],
    assumptions: [],
  },
  pearson_correlation: {
    family: MethodFamily.Correlation,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [
      soft(AssumptionId.Normality, "shapiro", ["spearman_correlation"]),
      soft(AssumptionId.Linearity, "scatter", ["spearman_correlation"]),
    ],
  },
  spearman_correlation: {
    family: MethodFamily.Correlation,
    outcomeTypes: [OutcomeType.Continuous, OutcomeType.Categorical],
    assumptions: [],
  },
  gam: {
    family: MethodFamily.Regression,
    outcomeTypes: [
      OutcomeType.Continuous,
      OutcomeType.Count,
      OutcomeType.Binary,
    ],
    assumptions: [
      soft(AssumptionId.ResidualNormality, "shapiro"),
      soft(AssumptionId.Homoscedasticity, "residual_plot"),
    ],
  },
  spline_regression: {
    family: MethodFamily.Regression,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [
      soft(AssumptionId.ResidualNormality, "shapiro"),
      soft(AssumptionId.Homoscedasticity, "breusch_pagan"),
    ],
  },
  ancova: {
    family: MethodFamily.Regression,
    outcomeTypes: [OutcomeType.Continuous],
    assumptions: [
      soft(AssumptionId.Linearity, "residual_plot"),
      soft(AssumptionId.ResidualNormality, "shapiro"),
      soft(AssumptionId.Homoscedasticity, "breusch_pagan"),
      soft(AssumptionId.HomogeneityOfSlopes, "interaction_test"),
      soft(AssumptionId.NoMulticollinearity, "vif"),
    ],
  },
  cmh: {
    family: MethodFamily.Categorical,
    outcomeTypes: [OutcomeType.Categorical, OutcomeType.Binary],
    assumptions: [soft(AssumptionId.Independence, "design")],
  },
};
