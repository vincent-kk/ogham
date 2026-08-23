---
name: setup
user-invocable: true
description: '[r-statistics:setup] Check whether R/Rscript is installed and, with explicit consent, guide a per-OS install via the system package manager. Trigger: "install R", "set up R", "R is not found", "R 설치", "Rscript 없음"'
argument-hint: "[--os windows|macos|linux] [--packages]"
version: "1.1.0"
complexity: simple
plugin: r-statistics
---

<!-- [INTERACTIVE] — installation changes the system; never run an installer without explicit consent. -->

# setup — Detect & Install R

Confirm R is available for the execution tools, and when it is missing, guide an install through the OS package manager. Installation is a **separate channel from `run_r`** and is **gated on explicit user consent** — a system change is irreversible.

## Steps

`--packages` runs only the package check (Step 6); it still needs a working Rscript, so if detection fails, install R first.

1. **Detect.** Call `mcp__plugin_r-statistics_tools__run_r` with a trivial script (e.g. `cat(R.version.string)`, `executionMode: "sync"`).
   - Result returned → R works. Report the version and continue to **Step 6**.
   - `R_NOT_FOUND` error → R is missing or off-PATH. Do Steps 2–5, then Step 6.
2. **Identify the OS** (or honor `--os`) and load the matching reference: [windows.md](./references/windows.md) · [macos.md](./references/macos.md) · [linux.md](./references/linux.md).
3. **Propose the command.** Show the exact approved package-manager command from the reference (Windows `winget` / `choco`, macOS `brew`, Linux distro manager). Explain what it does.
4. **Consent gate.** Ask the user to confirm before running anything. Only on an explicit "yes" run the command via `Bash`. If they decline, leave the command for them to run manually.
5. **Verify.** After install, re-run Step 1's detection. If R is on a non-standard path, tell the user to set `R_STATISTICS_RSCRIPT` to the `Rscript` location.
6. **Check & install packages** — full detail in [references/packages.md](./references/packages.md). Probe via `run_r`, capture its structured `managedLibraryPath`, and use that exact value for the consent-gated terminal install. Required-missing packages install unconditionally; offer optional packages **by use case** with `AskUserQuestion` (`multiSelect`), then re-verify through `run_r` and require the same path.

## Boundaries

### Always do

- Get explicit consent before executing any installer.
- Use only the approved package-manager command for the OS (R itself).
- Install the required package set unconditionally; offer optional packages by _use case_ and install each selected bundle in one pass, building the command from the _missing_ set only (exact form in [references/packages.md](./references/packages.md)).
- Use the current `run_r.managedLibraryPath` as the sole package installation target.

### Ask first

- Running any installer (R or R packages) — the consent gate, always.
- Which use cases to install (the multi-select), before composing the command.

### Never do

- Install R or change the system without confirmation.
- Run install commands (R or R packages) through `run_r` (it blocks them) — installation is a separate, consent-gated channel.
- Ask about the required packages, or about optional packages one-by-one — required are automatic; optional are grouped by use case.
- Reconstruct the managed library from a host home or host-specific environment variable.

Reply in the user's language. Technical terms and identifiers stay as-is.
