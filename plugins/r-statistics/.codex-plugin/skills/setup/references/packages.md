# R package check & install (Steps 6–9 detail)

Load this once R itself is confirmed present (SKILL.md Steps 1–5) and you are
proceeding to packages — the `--packages` path, or the tail of a fresh install.
Every install here is **consent-gated** and runs through the **terminal, never
`run_r`** (`run_r` blocks `install.packages`).

## Step 6 — Check packages

Via `mcp__plugin_r-statistics_tools__run_r` (`executionMode: "sync"`, read-only —
`requireNamespace` is not blocked). Probe the required set and every use-case
package, reporting what is missing in each group:

```r
required <- c("broom","rstatix","car","data.table","jsonlite")
usecase  <- c("ggplot2","ggpubr","patchwork","survival","survminer",
              "lme4","lmerTest","emmeans","MASS","sandwich","lmtest",
              "forecast","tsibble","modifiedmk","trend","gtsummary","gt",
              "flextable","arrow","quarto","knitr","rmarkdown")
miss <- function(p) p[!vapply(p, requireNamespace, logical(1), quietly = TRUE)]
rm <- miss(required); um <- miss(usecase)
cat("REQUIRED_MISSING:", if (length(rm)) paste(rm, collapse = " ") else "-", "\n")
cat("USECASE_MISSING:",  if (length(um)) paste(um, collapse = " ") else "-", "\n")
```

These lists mirror `REQUIRED_PACKAGES` and `PACKAGE_USE_CASES` in
`src/constants/defaults.ts` — keep in sync. `stats` is base R and never missing.

## Step 7 — Select use cases (the checkbox step)

Required-missing packages are always installed — never ask about them. For the
optional packages, do **not** ask package-by-package: ask by _use case_ and
install each chosen bundle at once. Use `AskUserQuestion` with
`multiSelect: true`, presenting the catalog below localized to the user's
language. The tool caps options at 4 per question, so split the bundles across up
to three `multiSelect` questions (e.g. model types, then time/trend, then
outputs/data); offer only bundles that still have a missing package. Each question's auto "Other" lets the
user describe an uncovered need.

| Use case                              | Installs                 |
| ------------------------------------- | ------------------------ |
| Graphs & visualization                | ggplot2 ggpubr patchwork |
| Survival analysis                     | survival survminer       |
| Mixed-effects / multilevel models     | lme4 lmerTest emmeans    |
| Count models (neg. binomial, Poisson) | MASS sandwich lmtest     |
| Time-series forecasting               | forecast tsibble         |
| Non-parametric trend detection        | modifiedmk trend         |
| Publication summary tables            | gtsummary gt flextable   |
| Large / columnar data input           | arrow                    |
| Report rendering                      | quarto knitr rmarkdown   |

**Dynamic needs.** When the user describes a need the catalog does not cover
(e.g. a multi-panel dashboard report), map it to the appropriate CRAN packages
yourself, state the chosen set with a one-line rationale, and fold it into the
same install. These may sit beyond the baseline whitelist — expected for
on-demand, consent-gated installs.

## Step 8 — Install (consent-gated, terminal)

**Not** `run_r`, which blocks `install.packages`. Build **one** command from the
union of required-missing ∪ every selected bundle's missing packages ∪ any
dynamic packages, de-duplicated. Install into the r-statistics managed library
only; this keeps terminal installs consistent with `run_r`, which prepends
`R_STATISTICS_LIB` and sets `R_LIBS_USER` to the same directory:

```bash
Rscript -e 'managed <- file.path(path.expand(Sys.getenv("CLAUDE_CONFIG_DIR", "~/.claude")), "plugins", "r-statistics", "runtime", "r-lib"); dir.create(managed, recursive=TRUE, showWarnings=FALSE); .libPaths(managed); install.packages(c("ggplot2","ggpubr","patchwork"), lib=managed, repos="https://cloud.r-project.org")'
```

Do not copy or move an existing user `win-library`/site-library tree into this
directory. Packages should be freshly installed there so compiled dependencies
match the active R installation.

Show the exact command, explain it, and run via `Bash` only on an explicit
"yes". The `quarto` entry is the R package — the **Quarto CLI** (reporting) is
a separate binary, out of scope here.

## Step 9 — Re-verify

Re-run Step 6; report the still-missing set per group.
