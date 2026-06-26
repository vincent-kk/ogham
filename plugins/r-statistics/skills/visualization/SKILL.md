---
name: visualization
user_invocable: true
description: '[r-statistics:visualization] Produce publication-ready statistical plots with ggplot2 — distributions, boxplots, scatter/regression, survival curves, forest plots — saved as image artifacts. Trigger: "plot this", "make a boxplot", "show the distribution", "scatter plot", "박스플롯 그려줘", "분포 시각화"'
argument-hint: "[--kind boxplot|scatter|distribution|survival|forest]"
version: "1.0.0"
complexity: simple
plugin: r-statistics
---

# visualization — ggplot2 Statistical Plots

Generate a statistical figure with `ggplot2` and save it as an image artifact.
Execution runs through `mcp__plugin_r-statistics_tools__run_r`.

## Steps

1. **Pick the plot** for the data and question:

   | kind         | ggplot2                                                   |
   | ------------ | --------------------------------------------------------- |
   | distribution | histogram / density (`geom_histogram`, `geom_density`)    |
   | boxplot      | `geom_boxplot` (+ jittered points) for group comparison   |
   | scatter      | `geom_point` + `geom_smooth` for two continuous variables |
   | survival     | step survival curve from a `survival::survfit` object     |
   | forest       | point + error-bar plot of effect estimates and CIs        |

2. **Build the plot** in R from `read_data("<id>")`, with clear axis labels, a
   readable theme (`theme_minimal()` or similar), and the grouping/colour the
   question implies.
3. **Save** with `save_plot_artifact("plot.<kind>", p, "<kind>.png", "<desc>")`
   (PNG by default; SVG/PDF on request). The helper registers it in the manifest.

## Boundaries

### Always do

- Save through `save_plot_artifact` (targets ARTIFACTS_DIR, registers the file).
- Label axes and units; keep the figure self-explanatory.

### Never do

- Write image files by hand-built paths or outside the artifact helpers.
- Infer statistical conclusions — this skill draws, it does not test.

Reply in the user's language. Technical terms and identifiers stay as-is.
