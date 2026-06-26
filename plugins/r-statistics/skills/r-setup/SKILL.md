---
name: r-setup
user_invocable: true
description: '[r-statistics:r-setup] Check whether R/Rscript is installed and, with explicit consent, guide a per-OS install via the system package manager. Trigger: "install R", "set up R", "R is not found", "R 설치", "Rscript 없음"'
argument-hint: "[--os windows|macos|linux] [--packages]"
version: "1.0.0"
complexity: simple
plugin: r-statistics
---

<!-- [INTERACTIVE] — installation changes the system; never run an installer without explicit consent. -->

# r-setup — Detect & Install R

Confirm R is available for the execution tools, and when it is missing, guide an
install through the OS package manager. Installation is a **separate channel
from `run-r`** and is **gated on explicit user consent** — a system change is
irreversible.

## Steps

`--packages` runs only the package check (Steps 6–8); it still needs a working
Rscript, so if detection fails, install R first.

1. **Detect.** Call `mcp__plugin_r-statistics_tools__run-r` with a trivial script
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
6. **Check R packages.** Via `mcp__plugin_r-statistics_tools__run-r`
   (`executionMode: "sync"`, read-only — `requireNamespace` is not blocked):

   ```r
   pkgs <- c("stats","broom","ggplot2","rstatix","survival","lme4",
             "MASS","car","gtsummary","arrow","data.table","jsonlite","quarto")
   missing <- pkgs[!vapply(pkgs, requireNamespace, logical(1), quietly = TRUE)]
   cat(if (length(missing)) paste("MISSING:", paste(missing, collapse = " "))
       else "ALL_PRESENT", "\n")
   ```

   This list mirrors `PACKAGE_WHITELIST` in `src/constants/defaults.ts` — keep in
   sync. `stats` is base R and never missing.

7. **Propose the install** (consent-gated, terminal — **not** `run-r`, which
   blocks `install.packages`). Build it from the _missing_ set only:

   ```bash
   Rscript -e 'install.packages(c("car","jsonlite"), repos="https://cloud.r-project.org")'
   ```

   Show the exact command, explain it, and run via `Bash` only on an explicit
   "yes". The `quarto` entry is the R package — the **Quarto CLI** (reporting) is
   a separate binary, out of scope here.

8. **Re-verify.** Re-run Step 6; report `ALL_PRESENT` or the still-missing set.

## Boundaries

### Always do

- Get explicit consent before executing any installer.
- Use only the approved package-manager command for the OS.
- Check R packages after R is confirmed; build the install command from the
  _missing_ set only, with a CRAN mirror (`https://cloud.r-project.org`).

### Ask first

- Running the installer (the consent gate) — always.

### Never do

- Install R or change the system without confirmation.
- Run install commands (R or R packages) through `run-r` (it blocks them) —
  installation is a separate, consent-gated channel.

Reply in the user's language. Technical terms and identifiers stay as-is.
