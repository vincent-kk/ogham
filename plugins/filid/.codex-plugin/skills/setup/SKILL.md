---
name: setup
user_invocable: true
description: '[filid:setup] Initialize FCA-AI fractal architecture: create config, open the browser settings page (config + rule docs in one form, persisted server-side), scan the directory tree, and generate missing INTENT.md and DETAIL.md files. Pass `--rules` to open the settings page only.'
argument-hint: '[path] [--rules]'
version: '1.5.0'
complexity: medium
plugin: filid
---

> **EXECUTION MODEL (Tier-2b, interactive escape hatch)**:
> Execute phases as a SINGLE CONTINUOUS OPERATION. The ONLY interactive
> checkpoint is Phase 0b, and its interaction happens in the BROWSER inside
> the blocking `mcp__plugin_filid_tools__open_settings` call — after that call returns,
> dispatch on `status` and IMMEDIATELY continue the chain in the same
> response. NEVER yield the turn after an MCP tool call returns or between
> phases. Large tool responses (e.g., mcp**plugin_filid_tools**fractal_scan) are internal
> working data — do NOT summarize them to the user. Skip phases with no
> work silently.

# setup — FCA-AI Initialization

Initialize the FCA-AI fractal context architecture in a project. Creates
the config, opens the local browser settings page where the user edits
`.filid/config.json` and rule doc deployment in one form, scans the
directory tree, classifies every directory by node type, generates missing
INTENT.md files for fractal nodes, and produces a validation report.

> **Detail References**: Each phase's detail lives in a separate file under
> `./sections/`. Load ONLY the section for the phase you're currently
> executing — do not pre-load the whole set.
>
> - Phase 0 (config + settings page): [sections/section-0-rule-docs.md](./sections/section-0-rule-docs.md)
> - Phase 1 (scan): [sections/section-1-directory-scan.md](./sections/section-1-directory-scan.md)
> - Phase 2 (classify): [sections/section-2-node-classification.md](./sections/section-2-node-classification.md)
> - Phase 3 (INTENT.md): [sections/section-3-intent-md-template.md](./sections/section-3-intent-md-template.md)
> - Phase 4 (DETAIL.md): [sections/section-4-detail-md-scaffolding.md](./sections/section-4-detail-md-scaffolding.md)
> - Phase 5 (validate): [sections/section-5-validation-report.md](./sections/section-5-validation-report.md)

## When to Use This Skill

- Starting a new project that will follow FCA-AI conventions
- Onboarding an existing codebase into the fractal context system
- **Managing rule doc application and config** — when optional rule docs exist
  the settings page toggles `.claude/rules/*.md`; config also edits through
  `/filid:config-wizard`
- Regenerating INTENT.md files after a large-scale refactor removed them
- Creating DETAIL.md scaffolds for modules that lack formal specifications
- Auditing which directories are correctly classified before running `/filid:scan`

## Argument Parsing

Before Phase 0a, inspect the invocation arguments:

- If the arguments contain `--rules`, enter **rules-only mode**: execute
  Phase 0a → Phase 0b, then STOP (skip Phase 1–5 entirely). This is the
  lightweight path for toggling rule docs or tweaking config without
  re-scanning or regenerating INTENT.md/DETAIL.md.
- Otherwise run the full workflow (Phase 0a → Phase 5).
- Any non-flag token is treated as the target `path` (default: current
  working directory). Phase 0b requires the ABSOLUTE form of this path.

## Prerequisites — Environment Check

Before starting the main workflow, check ast-grep availability by calling
`mcp__plugin_filid_tools__ast_grep_search` with a trivial pattern (e.g., `pattern: "$X"`, `language: "typescript"`, `path: "."`).

- **Available**: Proceed silently — no message needed.
- **Unavailable** (response contains "@ast-grep/napi is not available"):
  Display a non-blocking informational message and continue:
  ```
  [INFO] ast-grep is not installed.
  To use AST pattern matching, run: npm install -g @ast-grep/napi
  (optional — /filid:setup works without installation)
  ```
  The absence of ast-grep does NOT block any phase below.

## Core Workflow

### Phase 0a — Config Initialization

Call `mcp__plugin_filid_tools__project_init({ path, language })` to ensure `.filid/config.json`
exists at the git root with the default 8-rule configuration. Pass the
session's configured response language as `language` so generated docs and
`[filid:lang]` match the user's locale (omit for English). Existing config is
never overwritten. `mcp__plugin_filid_tools__project_init` does NOT touch `.claude/rules/` — that
is the settings page's job in Phase 0b.
See [sections/section-0-rule-docs.md — Phase 0a](./sections/section-0-rule-docs.md#phase-0a--config-initialization).

**→ Immediately proceed to Phase 0b.**

### Phase 0b — Settings Page <!-- [INTERACTIVE] -->

Inspect rule-doc state first to decide whether the browser earns its cost:
`mcp__plugin_filid_tools__rule_docs_sync({ action: "status", path: "<absolute-target-path>" })`.

**Optional docs exist** (`status.entries` non-empty) — open the browser for its
pre-checked selection UX:
`mcp__plugin_filid_tools__open_settings({ path: "<absolute-target-path>", waitSeconds: 300 })`.
The server persists config + rule docs on Save — do NOT also call
`mcp__plugin_filid_tools__rule_docs_sync`. Dispatch on `result.status`:

- `saved` — print a one-line rule doc summary from `result.summary.ruleDocs`
  (+ two drift hint lines when `drift` is non-empty)
- `pending` — call `mcp__plugin_filid_tools__open_settings` once more; if still pending,
  surface `result.url` and STOP
- `closed` — keep the existing config and continue

**No optional docs** (`status.entries` empty — the plugin ships only required
docs) — do NOT open the browser; nothing is selectable and the config form
adds no value over the CLI. Apply the required docs directly with
`mcp__plugin_filid_tools__rule_docs_sync({ action: "sync", path: "<absolute-target-path>", selections: {} })`,
print the one-line summary, and direct config edits to `/filid:config-wizard`.

See [sections/section-0-rule-docs.md — Phase 0b](./sections/section-0-rule-docs.md#phase-0b--settings-page)
for the full dispatch contract and the headless/CI fallback.

**→ If the invocation passed `--rules`, STOP here and emit a short completion
line (e.g., `"Rule docs applied — Phase 1–5 skipped"`). Otherwise immediately
proceed to Phase 1 in the same response.**

### Phase 1 — Directory Scan

Retrieve the complete project hierarchy using `mcp__plugin_filid_tools__fractal_scan`.
Build a working list of all directories from `tree.nodes` for classification.
See [sections/section-1-directory-scan.md](./sections/section-1-directory-scan.md).

**→ After `mcp__plugin_filid_tools__fractal_scan` returns — regardless of response size — extract `tree.nodes` as internal working data and immediately proceed to Phase 2. Do NOT summarize scan results to the user.**

### Phase 2 — Node Classification

Classify each directory as fractal, organ, or pure-function using
`mcp__plugin_filid_tools__fractal_navigate(action: "classify", path, entries)` (entries from Phase 1 scan) and priority-ordered decision rules.
See [sections/section-2-node-classification.md](./sections/section-2-node-classification.md).

**→ After classifying all directories, immediately proceed to Phase 3.**

### Phase 3 — INTENT.md Generation

Generate INTENT.md (≤50 lines, 3-tier boundaries) for each fractal directory
that lacks one. Organ directories are skipped. This phase delegates INTENT.md
generation to the `context-manager` agent (subagent_type: `filid:context-manager`).
See [sections/section-3-intent-md-template.md](./sections/section-3-intent-md-template.md).

**→ After generating all INTENT.md files (or if none needed), immediately proceed to Phase 4.**

### Phase 4 — DETAIL.md Scaffolding

Create DETAIL.md scaffolds for fractal modules with public APIs that lack
formal specifications.
See [sections/section-4-detail-md-scaffolding.md](./sections/section-4-detail-md-scaffolding.md).

**→ After generating all DETAIL.md scaffolds (or if none needed), immediately proceed to Phase 5.**

### Phase 5 — Validation and Report

Validate all generated files against FCA-AI rules and emit a summary report
that includes the settings summary from Phase 0b.
See [sections/section-5-validation-report.md](./sections/section-5-validation-report.md).

**After printing the summary report, execution is COMPLETE. Do not ask the user any follow-up questions.**

## Available MCP Tools

| Tool                                        | Action            | Purpose                                                                                                      |
| ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `mcp__plugin_filid_tools__project_init`     | —                 | Create `.filid/config.json` with defaults (Phase 0a)                                                         |
| `mcp__plugin_filid_tools__open_settings`    | —                 | Open the browser settings page and wait for Save (Phase 0b)                                                  |
| `mcp__plugin_filid_tools__rule_docs_sync`   | `status` / `sync` | Phase 0b gate: inspect rule-doc state, and apply docs directly when no optional docs exist or in headless/CI |
| `mcp__plugin_filid_tools__fractal_scan`     | —                 | Scan filesystem and retrieve complete project directory hierarchy                                            |
| `mcp__plugin_filid_tools__fractal_navigate` | `classify`        | Classify a single directory as fractal / organ / pure-function                                               |
| `mcp__plugin_filid_tools__ast_grep_search`  | —                 | AST pattern matching (optional — requires @ast-grep/napi)                                                    |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well.

```
/filid:setup [path] [--rules]
```

| Parameter | Type   | Default                   | Description                                                     |
| --------- | ------ | ------------------------- | --------------------------------------------------------------- |
| `path`    | string | Current working directory | Root directory to initialize                                    |
| `--rules` | flag   | off                       | Settings-only mode: run Phase 0a–0b, then stop (skip Phase 1–5) |

## Quick Reference

```bash
# Initialize current project (browser settings page opens in Phase 0b)
/filid:setup

# Initialize a specific sub-directory
/filid:setup src/payments

# Open the settings page only — no scan, no INTENT.md/DETAIL.md generation
/filid:setup --rules

# Re-run any time to toggle rule docs or tweak config. The page pre-checks
# deployed optional docs from filesystem state (no re-select trap), marks
# drifted docs with an "UPDATE AVAILABLE" badge, and only overwrites local
# edits when the per-row overwrite box is explicitly checked.

# Constants
KNOWN_ORGAN_DIR_NAMES (UI/shared)  = components | utils | types | hooks | helpers
                                     | lib | styles | assets | constants
KNOWN_ORGAN_DIR_NAMES (test/infra) = test | tests | spec | specs | fixtures | e2e
# __tests__, __mocks__, __fixtures__ are pattern-matched (priority 3), NOT list-matched.
KNOWN_ORGAN_DIR_NAMES (docs)       = references
INTENT_MD_LINE_LIMIT = 50 lines
3-TIER SECTIONS   = "Always do" | "Ask first" | "Never do"
DEEP_SCAN_RULE    = fractal nodes inside organ dirs are targets (iterate full tree.nodes)
```

Key rules:

- `.claude/rules/*.md` files are ONLY written or removed by this skill's
  surfaces: the settings page server (interactive) or `rule_docs_sync`
  (headless/CI fallback)
- Required rule docs (manifest `required: true`) are always auto-applied and
  auto-updated — the page lists them read-only and drift is overwritten on
  save without confirmation
- Optional rule docs render pre-checked from deployment state; drifted docs
  are overwritten only when the user checks the per-row overwrite box —
  otherwise local edits are preserved and reported as drift
- Session hooks never touch `.claude/rules/` or `.filid/config.json`
- Organ directories must never receive an INTENT.md
- INTENT.md must not exceed 50 lines
- All three boundary sections are required in every INTENT.md
- Existing INTENT.md files are preserved, never overwritten
