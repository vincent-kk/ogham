---
name: data-preparation
user_invocable: true
description: '[r-statistics:data-preparation] Load, profile, clean, and impute a dataset for analysis — variable types, distributions, missingness, and explicit (never silent) transformations. Trigger: "profile this data", "clean the dataset", "check for missing values", "데이터 정제", "결측치 확인"'
argument-hint: "[--data PATH]"
version: "1.0.0"
complexity: moderate
plugin: r-statistics
---

# data-preparation — Load · Profile · Clean · Impute

Prepare a dataset for statistical analysis and produce a `dataset_profile` the
`statistician` uses to select a method. Execution runs through `mcp__plugin_r-statistics_tools__run_r`
(via the `r-expert` agent in a full pipeline, or directly for a partial step).

## Steps

1. **Load.** Pass the dataset as a `run_r` `dataRefs` entry (the MCP resolves
   and copies it; never hand-build a path). In R, read it with
   `read_data("<id>")` — it dispatches on the declared format
   (`data.table::fread` for CSV, `arrow` for parquet/feather, etc.).
2. **Profile.** Compute, and emit as a JSON artifact
   (`write_json_artifact("data.profile", "table", profile, "profile.json")`):
   column names + inferred types, n, per-column missingness, distribution
   summaries (mean/sd/median/IQR for numeric, level counts for factors),
   and group structure if a grouping variable is named.
3. **Clean — explicitly.** Type fixes, factor releveling, and outlier handling
   are stated, not silent. Report every transformation; do not change values in
   a way that alters the analysis without saying so.
4. **Impute — explicitly.** If imputation is requested, state the method
   (mean / median / model-based) and the affected columns, and record it in the
   profile. Never silently fill missing values.

## Output

- `data.profile` artifact (JSON) — consumed by `statistician`.
- A short human-readable summary of types, missingness, and any transformation.

## Boundaries

### Always do

- Resolve data only via `run_r` `dataRefs` + `read_data`.
- Make every cleaning/imputation step explicit and reversible in description.

### Never do

- Silently coerce types, drop rows, or impute values.
- Select a statistical method (that is `statistician`).

Reply in the user's language. Technical terms and identifiers stay as-is.
