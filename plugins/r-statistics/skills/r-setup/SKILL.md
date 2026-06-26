---
name: r-setup
user_invocable: true
description: '[r-statistics:r-setup] Check whether R/Rscript is installed and, with explicit consent, guide a per-OS install via the system package manager. Trigger: "install R", "set up R", "R is not found", "R 설치", "Rscript 없음"'
argument-hint: "[--os windows|macos|linux] [--packages]"
version: "1.1.0"
complexity: simple
plugin: r-statistics
---

<!-- [INTERACTIVE] — installation changes the system; never run an installer without explicit consent. -->

# r-setup — Detect & Install R

Confirm R is available for the execution tools, and when it is missing, guide an
install through the OS package manager. Installation is a **separate channel
from `run_r`** and is **gated on explicit user consent** — a system change is
irreversible.

## Steps

`--packages` runs only the package check (Steps 6–9); it still needs a working
Rscript, so if detection fails, install R first.

1. **Detect.** Call `mcp__plugin_r-statistics_tools__run_r` with a trivial script
   (e.g. `cat(R.version.string)`, `executionMode: "sync"`).
   - Result returned → R works. Report the version and continue to **Step 6**.
   - `R_NOT_FOUND` error → R is missing or off-PATH. Do Steps 2–5, then Step 6.
2. **Identify the OS** (or honor `--os`) and load the matching reference:
   [windows.md](./references/windows.md) · [macos.md](./references/macos.md) ·
   [linux.md](./references/linux.md).
3. **Propose the command.** Show the exact approved package-manager command from
   the reference (Windows `winget` / `choco`, macOS `brew`, Linux distro
   manager). Explain what it does.
4. **Consent gate.** Ask the user to confirm before running anything. Only on an
   explicit "yes" run the command via `Bash`. If they decline, leave the command
   for them to run manually.
5. **Verify.** After install, re-run Step 1's detection. If R is on a
   non-standard path, tell the user to set `R_STATISTICS_RSCRIPT` to the
   `Rscript` location.
6. **Check packages.** Via `mcp__plugin_r-statistics_tools__run_r`
   (`executionMode: "sync"`, read-only — `requireNamespace` is not blocked).
   Probe the required set and every use-case package, reporting what is missing
   in each group:

   ```r
   required <- c("broom","rstatix","car","data.table","jsonlite")
   usecase  <- c("ggplot2","ggpubr","patchwork","survival","survminer",
                 "lme4","lmerTest","emmeans","MASS","sandwich","lmtest",
                 "forecast","tsibble","gtsummary","gt","flextable","arrow",
                 "quarto","knitr","rmarkdown")
   miss <- function(p) p[!vapply(p, requireNamespace, logical(1), quietly = TRUE)]
   rm <- miss(required); um <- miss(usecase)
   cat("REQUIRED_MISSING:", if (length(rm)) paste(rm, collapse = " ") else "-", "\n")
   cat("USECASE_MISSING:",  if (length(um)) paste(um, collapse = " ") else "-", "\n")
   ```

   These lists mirror `REQUIRED_PACKAGES` and `PACKAGE_USE_CASES` in
   `src/constants/defaults.ts` — keep in sync. `stats` is base R and never
   missing.

7. **Select use cases (the checkbox step).** Required-missing packages are
   always installed — never ask about them. For the optional packages, do **not**
   ask package-by-package: ask by _use case_ and install each chosen bundle at
   once. Use `AskUserQuestion` with `multiSelect: true`, presenting the catalog
   below localized to the user's language. The tool caps options at 4 per
   question, so split the bundles across up to two `multiSelect` questions (e.g.
   model types, then outputs/data); offer only bundles that still have a missing
   package. Each question's auto "Other" lets the user describe an uncovered need.

   | Use case                              | Installs                 |
   | ------------------------------------- | ------------------------ |
   | Graphs & visualization                | ggplot2 ggpubr patchwork |
   | Survival analysis                     | survival survminer       |
   | Mixed-effects / multilevel models     | lme4 lmerTest emmeans    |
   | Count models (neg. binomial, Poisson) | MASS sandwich lmtest     |
   | Time-series forecasting               | forecast tsibble         |
   | Publication summary tables            | gtsummary gt flextable   |
   | Large / columnar data input           | arrow                    |
   | Report rendering                      | quarto knitr rmarkdown   |

   **Dynamic needs.** When the user describes a need the catalog does not cover
   (e.g. a multi-panel dashboard report), map it to the appropriate CRAN packages
   yourself, state the chosen set with a one-line rationale, and fold it into the
   same install. These may sit beyond the baseline whitelist — expected for
   on-demand, consent-gated installs.

8. **Install** (consent-gated, terminal — **not** `run_r`, which blocks
   `install.packages`). Build **one** command from the union of required-missing ∪
   every selected bundle's missing packages ∪ any dynamic packages, de-duplicated.
   Install into the r-statistics managed library only; this keeps terminal
   installs consistent with `run_r`, which prepends `R_STATISTICS_LIB` and sets
   `R_LIBS_USER` to the same directory:

   ```bash
   Rscript -e 'managed <- file.path(path.expand(Sys.getenv("CLAUDE_CONFIG_DIR", "~/.claude")), "plugins", "r-statistics", "runtime", "r-lib"); dir.create(managed, recursive=TRUE, showWarnings=FALSE); .libPaths(managed); install.packages(c("ggplot2","ggpubr","patchwork"), lib=managed, repos="https://cloud.r-project.org")'
   ```

   Do not copy or move an existing user `win-library`/site-library tree into this
   directory. Packages should be freshly installed there so compiled dependencies
   match the active R installation.

   Show the exact command, explain it, and run via `Bash` only on an explicit
   "yes". The `quarto` entry is the R package — the **Quarto CLI** (reporting) is
   a separate binary, out of scope here.

9. **Re-verify.** Re-run Step 6; report the still-missing set per group.

## Boundaries

### Always do

- Get explicit consent before executing any installer.
- Use only the approved package-manager command for the OS (R itself).
- Install the required package set unconditionally; offer optional packages by
  _use case_ and install each selected bundle in one pass. Build the command from
  the _missing_ set only, with a CRAN mirror (`https://cloud.r-project.org`) and
  `install.packages(..., lib=managed)` after forcing `.libPaths(managed)`.

### Ask first

- Running any installer (R or R packages) — the consent gate, always.
- Which use cases to install (the multi-select), before composing the command.

### Never do

- Install R or change the system without confirmation.
- Run install commands (R or R packages) through `run_r` (it blocks them) —
  installation is a separate, consent-gated channel.
- Ask about the required packages, or about optional packages one-by-one —
  required are automatic; optional are grouped by use case.

Reply in the user's language. Technical terms and identifiers stay as-is.
