---
name: assumption-check
user_invocable: true
description: '[r-statistics:assumption-check] Run the assumption tests a method requires — normality, homogeneity of variance, independence, multicollinearity, proportional hazards — and emit pass/fail artifacts that feed the analysis gate. Trigger: "check normality", "test the assumptions", "is the variance equal", "정규성 검정", "등분산 검정"'
argument-hint: "[--method TECHNIQUE]"
version: "1.0.0"
complexity: moderate
plugin: r-statistics
---

# assumption-check — Verify Method Assumptions

Run the statistical assumptions a chosen method requires and produce
`assumption.{id}` artifacts (each with a `passed` boolean) that
`assert_analysis_plan` consumes. Execution runs through `mcp__plugin_r-statistics_tools__run_r`.

## Steps

1. **Resolve the assumption set.** Read the chosen technique's
   `../analyze/references/methods/{technique}/meta.yaml`
   `required_assumptions` (id + check). For a partial-step call, infer the
   assumptions from the method the user names.
2. **Run each check** in R (via `run_r`), mapping check → test:

   | check                 | R                                                                                                                                             |
   | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
   | `shapiro`             | `stats::shapiro.test` (residuals for regression/ANOVA)                                                                                        |
   | `levene`              | `car::leveneTest`                                                                                                                             |
   | `breusch_pagan`       | `car::ncvTest`                                                                                                                                |
   | `durbin_watson`       | `car::durbinWatsonTest`                                                                                                                       |
   | `vif`                 | `car::vif`                                                                                                                                    |
   | `dispersion`          | Pearson dispersion statistic                                                                                                                  |
   | `cox_zph`             | `survival::cox.zph`                                                                                                                           |
   | `expected_counts`     | expected cell counts of the contingency table                                                                                                 |
   | `box_tidwell`         | `car::boxTidwell`                                                                                                                             |
   | `residual_plot`       | residuals vs fitted via `ggplot2` (visual linearity / scale)                                                                                  |
   | `scatter`             | `ggplot2` scatter + loess smooth (visual linearity)                                                                                           |
   | `martingale_residual` | `survival` martingale residuals vs covariate (functional form)                                                                                |
   | `epv`                 | events ÷ predictors (common screening threshold ≥ 10; Peduzzi et al. 1996, clinical prediction-model practice, may be conservative elsewhere) |
   | `design`              | design assumption — `note_assumption(id)`, pass by design (no test)                                                                           |

3. **Emit artifacts.** For each assumption, write
   `assumption.{id}` (kind `assumption_check`) with the test statistic, p-value,
   and a `passed` boolean, then `note_assumption("{id}")`. Use a conventional
   threshold (e.g. p ≥ 0.05 for normality/homogeneity) and state it. Visual
   checks (`residual_plot`, `scatter`, `martingale_residual`) emit the diagnostic
   plot plus a heuristic `passed`; metric/count-threshold checks (`vif`,
   `dispersion`, `expected_counts`, `epv`) emit their ratio/count with `passed`
   against the threshold; `design` records `passed: true` as a design assumption.
   EPV thresholds come from clinical prediction-model practice (Peduzzi et al. 1996) and may be conservative for other application domains. These non-test
   checks carry no p-value.

## Output

- One `assumption.{id}` artifact per required assumption (`passed` flag).
- A summary table the dispatcher passes to `assert_analysis_plan` as
  `assumptionArtifacts`.

## Boundaries

### Always do

- Produce an explicit `passed` flag and the threshold used.
- Test residual-based assumptions on the fitted model's residuals.

### Never do

- Decide whether to proceed (that is the gate / `statistician`).
- Silently switch methods on a failed assumption.

Reply in the user's language. Technical terms and identifiers stay as-is.
