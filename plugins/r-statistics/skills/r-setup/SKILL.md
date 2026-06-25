---
name: r-setup
user_invocable: true
description: '[r-statistics:r-setup] Check whether R/Rscript is installed and, with explicit consent, guide a per-OS install via the system package manager. Trigger: "install R", "set up R", "R is not found", "R 설치", "Rscript 없음"'
argument-hint: "[--os windows|macos|linux]"
version: "1.0.0"
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

1. **Detect.** Call `mcp_tools_run_r` with a trivial script (e.g.
   `cat(R.version.string)`, `executionMode: "sync"`).
   - Result returned → R works. Report the version and stop.
   - `R_NOT_FOUND` error → R is missing or off-PATH. Continue.
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

## Boundaries

### Always do

- Get explicit consent before executing any installer.
- Use only the approved package-manager command for the OS.

### Ask first

- Running the installer (the consent gate) — always.

### Never do

- Install R or change the system without confirmation.
- Run install commands through `run_r` (it blocks them) — installation is a
  separate, consent-gated channel.

Reply in the user's language. Technical terms and identifiers stay as-is.
