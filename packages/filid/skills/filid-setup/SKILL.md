---
name: filid-setup
user_invocable: true
description: "[filid:filid-setup] Initialize FCA-AI fractal architecture: create config, deploy selected rule docs via checkbox UI, scan the directory tree, and generate missing INTENT.md and DETAIL.md files."
argument-hint: "[path]"
version: "1.1.0"
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
> At `<!-- [INTERACTIVE] -->` markers, present the checkbox prompt, wait
> for the user's answer, then resume the chain in the same response.

# filid-setup — FCA-AI Initialization

Initialize the FCA-AI fractal context architecture in a project. Creates
the config, asks the user which rule docs to deploy via a checkbox UI,
scans the directory tree, classifies every directory by node type,
generates missing INTENT.md files for fractal nodes, and produces a
validation report.

> **Detail Reference**: For detailed workflow steps, MCP tool examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

## When to Use This Skill

- Starting a new project that will follow FCA-AI conventions
- Onboarding an existing codebase into the fractal context system
- **Managing rule doc deployment** — this skill is the single entry point
  for adding or removing `.claude/rules/*.md` files
- Regenerating INTENT.md files after a large-scale refactor removed them
- Creating DETAIL.md scaffolds for modules that lack formal specifications
- Auditing which directories are correctly classified before running `/filid:filid-scan`

## Prerequisites — Environment Check

Before starting the main workflow, check ast-grep availability by calling
`ast_grep_search` with a trivial pattern (e.g., `pattern: "$X"`, `language: "typescript"`, `path: "."`).

- **Available**: Proceed silently — no message needed.
- **Unavailable** (response contains "@ast-grep/napi is not available"):
  Display a non-blocking informational message and continue:
  ```
  [INFO] ast-grep이 설치되지 않았습니다.
  AST 패턴 매칭 기능을 사용하려면: npm install -g @ast-grep/napi
  (선택사항 — 설치 없이도 /filid:filid-setup은 정상 동작합니다)
  ```
  The absence of ast-grep does NOT block any phase below.

## Core Workflow

### Phase 0a — Config Initialization

Call `project_init` to ensure `.filid/config.json` exists at the git root:

```
project_init({ path: "<target-path>" })
```

This creates `.filid/config.json` with the default rule configuration
(all 8 built-in rules enabled). Existing config is never overwritten.
`project_init` does NOT touch `.claude/rules/` — that is handled by
Phase 0b below.

**→ Immediately proceed to Phase 0b.**

### Phase 0b — Rule Docs Status

Call `rule_docs_sync` with `action: "status"` to inspect the current state
of every rule doc declared in the plugin manifest:

```
rule_docs_sync({ action: "status", path: "<target-path>" })
```

The response `status.entries[]` is a list of:
```
{ id, filename, required, title, description, deployed, selected }
```
where `deployed` reflects filesystem state under `.claude/rules/` and
`selected` reflects the desired state recorded in
`.filid/config.json`'s `injected-rules` map.

Build an internal map `currentSelection: Record<string, boolean>` from
these entries (`selected` field). Required rules are always `true`.

**→ Immediately proceed to Phase 0c.**

### Phase 0c — Rule Docs Checkbox <!-- [INTERACTIVE] -->

Present a checkbox prompt listing every entry from Phase 0b using
`AskUserQuestion`. Use a single multi-select question:

- Question: `"배포할 규칙 문서를 선택하세요 (필수 항목은 해제할 수 없습니다)"`
- Options: one per manifest entry, with the label `title` and description
  `description`. Pre-check any entry where `selected === true`. Mark
  required entries as non-togglable in the prompt text
  (e.g., `"(필수)"` suffix).

After the user answers, compute `nextSelection: Record<string, boolean>`:
- For every required entry, force `true`.
- For every optional entry, set `true` if the user checked it, otherwise `false`.

If `nextSelection` is deep-equal to `currentSelection` AND every entry's
`deployed === selected`, skip Phase 0d (no-op) and proceed to Phase 1.

**→ Proceed to Phase 0d with `nextSelection` in the same response.**

### Phase 0d — Rule Docs Sync

Call `rule_docs_sync` with `action: "sync"` and the computed selection:

```
rule_docs_sync({
  action: "sync",
  path: "<target-path>",
  selections: <nextSelection>
})
```

The handler writes `injected-rules` into `.filid/config.json` and then
copies/removes files under `.claude/rules/` to match. Inspect
`result.copied`, `result.removed`, `result.unchanged`, `result.skipped`
and surface a one-line summary to the user
(e.g., `"규칙 문서: copied=fca.md, removed=0, unchanged=0"`).

If `result.skipped` is non-empty, print each `{ id, reason }` as a
warning but DO NOT abort — continue with the remaining phases.

> **Note**: `.filid/config.json` and deployed `.claude/rules/*.md` files
> should be committed to version control. `.filid/review/` and
> `.filid/cache/` should be gitignored (transient data).

**→ Immediately proceed to Phase 1.**

### Phase 1 — Directory Scan

Retrieve the complete project hierarchy using `fractal_scan`.
Build a working list of all directories from `tree.nodes` for classification.
See [reference.md Section 1](./reference.md#section-1--directory-scan-details).

**→ After `fractal_scan` returns — regardless of response size — extract `tree.nodes` as internal working data and immediately proceed to Phase 2. Do NOT summarize scan results to the user.**

### Phase 2 — Node Classification

Classify each directory as fractal, organ, or pure-function using
`fractal_navigate(action: "classify", path, entries)` (entries from Phase 1 scan) and priority-ordered decision rules.
See [reference.md Section 2](./reference.md#section-2--node-classification-rules).

**→ After classifying all directories, immediately proceed to Phase 3.**

### Phase 3 — INTENT.md Generation

Generate INTENT.md (≤50 lines, 3-tier boundaries) for each fractal directory
that lacks one. Organ directories are skipped. This phase delegates INTENT.md
generation to the `context-manager` agent (subagent_type: `filid:context-manager`).
See [reference.md Section 3](./reference.md#section-3--intentmd-generation-template).

**→ After generating all INTENT.md files (or if none needed), immediately proceed to Phase 4.**

### Phase 4 — DETAIL.md Scaffolding

Create DETAIL.md scaffolds for fractal modules with public APIs that lack
formal specifications.
See [reference.md Section 4](./reference.md#section-4--detailmd-scaffolding).

**→ After generating all DETAIL.md scaffolds (or if none needed), immediately proceed to Phase 5.**

### Phase 5 — Validation and Report

Validate all generated files against FCA-AI rules and emit a summary report
that includes the rule doc sync summary from Phase 0d.
See [reference.md Section 5](./reference.md#section-5--validation-and-report-format).

**After printing the summary report, execution is COMPLETE. Do not ask the user any follow-up questions.**

## Available MCP Tools

| Tool               | Action     | Purpose                                                            |
| ------------------ | ---------- | ------------------------------------------------------------------ |
| `project_init`     | —          | Create `.filid/config.json` with defaults (Phase 0a)               |
| `rule_docs_sync`   | `status`   | Inspect current rule doc state (Phase 0b)                          |
| `rule_docs_sync`   | `sync`     | Persist selection + copy/remove `.claude/rules/*.md` (Phase 0d)    |
| `rule_docs_sync`   | `manifest` | (Optional) Fetch raw manifest for custom UI rendering              |
| `fractal_scan`     | —          | Scan filesystem and retrieve complete project directory hierarchy  |
| `fractal_navigate` | `classify` | Classify a single directory as fractal / organ / pure-function     |
| `ast_grep_search`  | —          | AST pattern matching (optional — requires @ast-grep/napi)          |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well.

```
/filid:filid-setup [path]
```

| Parameter | Type   | Default                   | Description                  |
| --------- | ------ | ------------------------- | ---------------------------- |
| `path`    | string | Current working directory | Root directory to initialize |

## Quick Reference

```bash
# Initialize current project (checkbox UI appears in Phase 0c)
/filid:filid-setup

# Initialize a specific sub-directory
/filid:filid-setup src/payments

# Re-run to toggle optional rule docs without re-scanning
# (checkbox pre-fills with the current config state)

# Constants
KNOWN_ORGAN_DIR_NAMES (UI/shared)  = components | utils | types | hooks | helpers
                                     | lib | styles | assets | constants
KNOWN_ORGAN_DIR_NAMES (test/infra) = __tests__ | __mocks__ | __fixtures__
                                     | test | tests | spec | specs | fixtures | e2e
INTENT_MD_LINE_LIMIT = 50 lines
3-TIER SECTIONS   = "Always do" | "Ask first" | "Never do"
DEEP_SCAN_RULE    = fractal nodes inside organ dirs are targets (iterate full tree.nodes)
```

Key rules:

- `.claude/rules/*.md` files are ONLY written or removed inside this skill
- Required rule docs (manifest `required: true`) are always deployed — the checkbox for them is pre-checked and non-togglable
- Session hooks never touch `.claude/rules/` or `.filid/config.json`
- Organ directories must never receive an INTENT.md
- INTENT.md must not exceed 50 lines
- All three boundary sections are required in every INTENT.md
- Existing INTENT.md files are preserved, never overwritten
