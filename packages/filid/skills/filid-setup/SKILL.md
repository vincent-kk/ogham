---
name: filid-setup
user_invocable: true
description: "[filid:filid-setup] Initialize FCA-AI fractal architecture: create config, apply selected rule docs via a count-aware prompt (0/1/N optional rules), scan the directory tree, and generate missing INTENT.md and DETAIL.md files. Pass `--rules` to update rule docs only."
argument-hint: "[path] [--rules]"
version: "1.4.0"
complexity: medium
plugin: filid
---

> **EXECUTION MODEL (Tier-2b, interactive escape hatch)**:
> Execute phases as a SINGLE CONTINUOUS OPERATION, except at explicitly
> marked `<!-- [INTERACTIVE] -->` points where a user decision is required.
> After each phase completes, IMMEDIATELY proceed to the next.
> NEVER yield the turn after an MCP tool call returns or between non-interactive phases.
> Large tool responses (e.g., fractal_scan) are internal working data —
> do NOT summarize them to the user. Skip phases with no work silently.
> At `<!-- [INTERACTIVE] -->` markers, present the appropriate prompt
> shape for `status.entries.length` (see Phase 0c), wait for the user's
> answer, then resume the chain in the same response.

# filid-setup — FCA-AI Initialization

Initialize the FCA-AI fractal context architecture in a project. Creates
the config, asks the user which rule docs to apply via a checkbox UI,
scans the directory tree, classifies every directory by node type,
generates missing INTENT.md files for fractal nodes, and produces a
validation report.

> **Detail References**: Each phase's detail lives in a separate file under
> `./sections/`. Load ONLY the section for the phase you're currently
> executing — do not pre-load the whole set.
>
> - Phase 0 (rule docs): [sections/section-0-rule-docs.md](./sections/section-0-rule-docs.md)
> - Phase 1 (scan): [sections/section-1-directory-scan.md](./sections/section-1-directory-scan.md)
> - Phase 2 (classify): [sections/section-2-node-classification.md](./sections/section-2-node-classification.md)
> - Phase 3 (INTENT.md): [sections/section-3-intent-md-template.md](./sections/section-3-intent-md-template.md)
> - Phase 4 (DETAIL.md): [sections/section-4-detail-md-scaffolding.md](./sections/section-4-detail-md-scaffolding.md)
> - Phase 5 (validate): [sections/section-5-validation-report.md](./sections/section-5-validation-report.md)

## When to Use This Skill

- Starting a new project that will follow FCA-AI conventions
- Onboarding an existing codebase into the fractal context system
- **Managing rule doc application** — this skill is the single entry point
  for adding or removing `.claude/rules/*.md` files
- Regenerating INTENT.md files after a large-scale refactor removed them
- Creating DETAIL.md scaffolds for modules that lack formal specifications
- Auditing which directories are correctly classified before running `/filid:filid-scan`

## Argument Parsing

Before Phase 0a, inspect the invocation arguments:

- If the arguments contain `--rules`, enter **rules-only mode**: execute
  Phase 0a → Phase 0d, then STOP (skip Phase 1–5 entirely). This is the
  lightweight path for toggling which `.claude/rules/*.md` files are
  applied without re-scanning or regenerating INTENT.md/DETAIL.md.
- Otherwise run the full workflow (Phase 0a → Phase 5).
- Any non-flag token is treated as the target `path` (default: current
  working directory).

## Prerequisites — Environment Check

Before starting the main workflow, check ast-grep availability by calling
`mcp_t_ast_grep_search` with a trivial pattern (e.g., `pattern: "$X"`, `language: "typescript"`, `path: "."`).

- **Available**: Proceed silently — no message needed.
- **Unavailable** (response contains "@ast-grep/napi is not available"):
  Display a non-blocking informational message and continue:
  ```
  [INFO] ast-grep is not installed.
  To use AST pattern matching, run: npm install -g @ast-grep/napi
  (optional — /filid:filid-setup works without installation)
  ```
  The absence of ast-grep does NOT block any phase below.

## Core Workflow

### Phase 0a — Config Initialization

Call `mcp_t_project_init({ path })` to ensure `.filid/config.json` exists at
the git root with the default 8-rule configuration. Existing config is never
overwritten. `mcp_t_project_init` does NOT touch `.claude/rules/` — that is
Phase 0b's job.
See [sections/section-0-rule-docs.md — Phase 0a](./sections/section-0-rule-docs.md#phase-0a--config-initialization).

**→ Immediately proceed to Phase 0b.**

### Phase 0b — Rule Docs Status

Call `mcp_t_rule_docs_sync({ action: "status", path })` to inspect deployed
rule docs and template drift. The response partitions rules into
`status.entries[]` (optional — feeds Phase 0c UI) and `status.autoDeployed[]`
(required — auto-synced silently). Each optional entry carries
`templateHash` / `deployedHash` / `inSync` so drift can be surfaced in the UI.
If `status.pluginRootResolved === false`, fail fast and skip Phase 0c/0d.
See [sections/section-0-rule-docs.md — Phase 0b](./sections/section-0-rule-docs.md#phase-0b--rule-docs-status).

**→ Immediately proceed to Phase 0c.**

### Phase 0c — Rule Docs Prompt <!-- [INTERACTIVE] -->

Dispatch on `N = status.entries.length` (number of **optional** rules only):

- `N === 0`: skip `AskUserQuestion`, `nextSelection = {}`
- `N === 1`: single-select Yes/No with three label states
  (`Apply:` / `[ON] Keep:` / `[UPDATE] Apply latest:`)
- `N >= 2`: multi-select checkbox, exactly ONE option per optional entry,
  prefixed with `[ON]` (applied + in-sync) or `[UPDATE]` (applied + drift).
  Required rules from `status.autoDeployed[]` MUST NOT appear in the UI.

Then derive `resyncIds` from drifted optional rules that the user kept on:

```ts
const resyncIds = status.entries
  .filter((e) => e.deployed && !e.inSync && nextSelection[e.id] === true)
  .map((e) => e.id);
```

See [sections/section-0-rule-docs.md — Phase 0c](./sections/section-0-rule-docs.md#phase-0c--rule-docs-prompt)
for Case A/B/C `AskUserQuestion` call shapes, header copy, hard rules, and
response-mapping logic.

**→ Proceed to Phase 0d with `nextSelection` and `resyncIds` in the same response.**

### Phase 0d — Rule Docs Sync

Call `mcp_t_rule_docs_sync({ action: "sync", path, selections, resync })`.
`selections` MUST be a raw `Record<string, boolean>` map (never a JSON string);
`resync` MUST be a raw string array (or omitted). Surface a one-line summary
from `result.copied / removed / updated / drift / unchanged / skipped`. When
`result.drift` is non-empty, append TWO hint lines (status + action).
See [sections/section-0-rule-docs.md — Phase 0d](./sections/section-0-rule-docs.md#phase-0d--rule-docs-sync).

**→ If the invocation passed `--rules`, STOP here and emit a short completion
line (e.g., `"Rule docs updated — Phase 1–5 skipped"`). Otherwise immediately
proceed to Phase 1.**

### Phase 1 — Directory Scan

Retrieve the complete project hierarchy using `mcp_t_fractal_scan`.
Build a working list of all directories from `tree.nodes` for classification.
See [sections/section-1-directory-scan.md](./sections/section-1-directory-scan.md).

**→ After `mcp_t_fractal_scan` returns — regardless of response size — extract `tree.nodes` as internal working data and immediately proceed to Phase 2. Do NOT summarize scan results to the user.**

### Phase 2 — Node Classification

Classify each directory as fractal, organ, or pure-function using
`mcp_t_fractal_navigate(action: "classify", path, entries)` (entries from Phase 1 scan) and priority-ordered decision rules.
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
that includes the rule doc sync summary from Phase 0d.
See [sections/section-5-validation-report.md](./sections/section-5-validation-report.md).

**After printing the summary report, execution is COMPLETE. Do not ask the user any follow-up questions.**

## Available MCP Tools

| Tool                     | Action     | Purpose                                                            |
| ------------------------ | ---------- | ------------------------------------------------------------------ |
| `mcp_t_project_init`     | —          | Create `.filid/config.json` with defaults (Phase 0a)               |
| `mcp_t_rule_docs_sync`   | `status`   | Inspect current rule doc state (Phase 0b)                          |
| `mcp_t_rule_docs_sync`   | `sync`     | Persist selection + copy/remove `.claude/rules/*.md` (Phase 0d)    |
| `mcp_t_rule_docs_sync`   | `manifest` | (Optional) Fetch raw manifest for custom UI rendering              |
| `mcp_t_fractal_scan`     | —          | Scan filesystem and retrieve complete project directory hierarchy  |
| `mcp_t_fractal_navigate` | `classify` | Classify a single directory as fractal / organ / pure-function     |
| `mcp_t_ast_grep_search`  | —          | AST pattern matching (optional — requires @ast-grep/napi)          |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well.

```
/filid:filid-setup [path] [--rules]
```

| Parameter | Type   | Default                   | Description                                                  |
| --------- | ------ | ------------------------- | ------------------------------------------------------------ |
| `path`    | string | Current working directory | Root directory to initialize                                 |
| `--rules` | flag   | off                       | Rules-only mode: run Phase 0a–0d, then stop (skip Phase 1–5) |

## Quick Reference

```bash
# Initialize current project (checkbox UI appears in Phase 0c)
/filid:filid-setup

# Initialize a specific sub-directory
/filid:filid-setup src/payments

# Update rule docs only — no scan, no INTENT.md/DETAIL.md generation
/filid:filid-setup --rules

# Re-run to toggle optional rule docs or accept template updates. Phase 0c
# dispatches on the number of optional rules: N=0 skips the prompt, N=1
# shows a single-select Yes/No, N>=2 shows a multi-select checkbox where
# "[ON]" marks already-applied items whose content matches the plugin
# template, and "[UPDATE]" marks already-applied items whose plugin
# template has changed (re-checking an [UPDATE] item overwrites local
# edits with the new template). AskUserQuestion cannot pre-check options
# — in the N>=2 case you MUST re-select every item you want to keep
# applied; unchecked optional items are removed.

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

- `.claude/rules/*.md` files are ONLY written or removed inside this skill
- Required rule docs (manifest `required: true`) are always auto-applied and auto-updated — they NEVER appear in the prompt UI, the user cannot opt out, and drift is overwritten without confirmation
- Optional rule docs showing drift are labeled with `[UPDATE]` in the Phase 0c checkbox UI; re-checking accepts the template update, unchecking removes the file, leaving the box in its previous state preserves the local copy until the next `--rules` run
- Session hooks never touch `.claude/rules/` or `.filid/config.json`
- Organ directories must never receive an INTENT.md
- INTENT.md must not exceed 50 lines
- All three boundary sections are required in every INTENT.md
- Existing INTENT.md files are preserved, never overwritten
