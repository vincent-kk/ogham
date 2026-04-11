---
name: filid-setup
user_invocable: true
description: "[filid:filid-setup] Initialize FCA-AI fractal architecture: create config, apply selected rule docs via a count-aware prompt (0/1/N optional rules), scan the directory tree, and generate missing INTENT.md and DETAIL.md files. Pass `--rules` to update rule docs only."
argument-hint: "[path] [--rules]"
version: "1.3.0"
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

> **Detail Reference**: For detailed workflow steps, MCP tool examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

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
`ast_grep_search` with a trivial pattern (e.g., `pattern: "$X"`, `language: "typescript"`, `path: "."`).

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

The response partitions rules into two disjoint lists:

- `status.entries[]` — **optional** rules only. This is the ONLY list
  rendered as checkboxes in Phase 0c. Each entry:
  ```
  { id, filename, required: false, title, description, deployed, selected }
  ```
  `deployed` reflects filesystem state under `.claude/rules/` and
  `selected === deployed` for optional rules (no config-side tracking).
- `status.autoDeployed[]` — **required** rules. Always auto-synced by
  `rule_docs_sync({ action: "sync" })` regardless of user input. Use
  this list ONLY for the Phase 0d summary line — NEVER render these
  entries as checkboxes. The user cannot opt out of required rules.

Build an internal map `currentSelection: Record<string, boolean>` from
`status.entries` only (`selected` field). Do NOT include any required
entries — they are implicit and must not appear in the UI.

**→ Immediately proceed to Phase 0c.**

### Phase 0c — Rule Docs Prompt <!-- [INTERACTIVE] -->

Dispatch on `N = status.entries.length` (number of **optional** rules only).
Required rules from `status.autoDeployed[]` are enforced by the sync handler
and MUST NEVER appear in the option list in any case.

`AskUserQuestion` requires a **minimum of 2 options per question**, so the
prompt shape depends on `N`. Compute `nextSelection: Record<string, boolean>`
keyed by optional rule `id` (required rules MUST NOT appear in it):

#### Case A — `N === 0` (no optional rules)

Skip `AskUserQuestion` entirely. Set `nextSelection = {}` and proceed to
Phase 0d. Required rules still get auto-applied by `syncRuleDocs`.

#### Case B — `N === 1` (exactly one optional rule)

A one-item multi-select is invalid (min 2 options). Render a
**single-select Yes/No prompt** whose two options represent the two
possible states of that single rule.

```ts
const entry = status.entries[0];
const on = entry.deployed;

AskUserQuestion({
  questions: [
    {
      question: "<translate `Apply rule doc "${entry.title}"?` to [filid:lang]>",
      multiSelect: false,
      header: "Rule docs",
      options: [
        {
          label: on ? `[ON] Keep: ${entry.title}` : `Apply: ${entry.title}`,
          description: entry.description,
        },
        {
          label: on ? `Remove: ${entry.title}` : `Skip: ${entry.title}`,
          description: "<translate `Do not apply this rule doc.` to [filid:lang]>",
        },
      ],
    },
  ],
});
```

Map the user's answer to `nextSelection`:
- First option chosen → `nextSelection[entry.id] = true`
- Second option chosen → `nextSelection[entry.id] = false`

The `[ON]` prefix is a literal English token marking the currently applied
state — do NOT translate it.

#### Case C — `N >= 2` (two or more optional rules)

Render a **multi-select checkbox prompt** with exactly one option per
optional entry.

```ts
AskUserQuestion({
  questions: [
    {
      question: "<translate the header below to [filid:lang]>",
      multiSelect: true,
      header: "Rule docs",
      options: status.entries.map((entry) => ({
        label: entry.deployed ? `[ON] ${entry.title}` : entry.title,
        description: entry.description,
      })),
    },
  ],
});
```

**Header** (English default; translate surrounding text but keep `[ON]`
untranslated):
`"Select rule docs to apply. Items prefixed with '[ON]' will be REMOVED if you do not re-check them."`

**Hard rules**:
1. `multiSelect: true` is MANDATORY in Case C.
2. Exactly ONE option per optional entry — NEVER pair an entry with a
   "keep"/"remove" companion option.
3. Required rules MUST NOT appear as options.
4. `[ON]` is the ONLY allowed bracketed prefix; do NOT add
   `[V]` / `[ ]` / `[X]` / `[✓]` markers — they collide with the UI's
   own checkbox column.

Map the user's answer to `nextSelection`:
- For every `entry` in `status.entries`, set
  `nextSelection[entry.id] = userAnswer.some((label) => label.includes(entry.title))`.
- `AskUserQuestion` returns only the labels the user checked, so any
  entry whose title is NOT found in the answer list is `false`.

#### Proceed to Phase 0d

Always proceed to Phase 0d with the computed `nextSelection`. The sync
handler is idempotent — calling it when nothing changes is cheap and
guarantees required rules stay applied.

**→ Proceed to Phase 0d with `nextSelection` in the same response.**

### Phase 0d — Rule Docs Sync

Call `rule_docs_sync` with `action: "sync"` and the computed selection:

```
rule_docs_sync({
  action: "sync",
  path: "<target-path>",
  selections: { fca: true, rfx: false }
})
```

`selections` MUST be passed as a raw object map (`Record<string, boolean>`),
not as a JSON string. For example, use
`selections: { fca: true, rfx: false }`, NOT
`selections: "{\"fca\":true,\"rfx\":false}"`.

The handler copies/removes files under `.claude/rules/` to match the
requested selection. No rule doc state is stored in `.filid/config.json`
— the filesystem is authoritative.

Inspect `result.copied`, `result.removed`, `result.unchanged`,
`result.skipped` and surface a one-line summary to the user (English default;
translate to `[filid:lang]` at runtime, e.g.,
`"Rule docs: copied=fca.md, removed=0, unchanged=0"`).

If `result.skipped` is non-empty, print each `{ id, reason }` as a
warning but DO NOT abort — continue with the remaining phases.

> **Note**: `.filid/config.json` and applied `.claude/rules/*.md` files
> should be committed to version control. `.filid/review/` and
> `.filid/cache/` should be gitignored (transient data).

**→ If the invocation passed `--rules`, STOP here and emit a short
completion line (English default; translate to `[filid:lang]` at runtime,
e.g., `"Rule docs updated — Phase 1–5 skipped"`). Otherwise immediately
proceed to Phase 1.**

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

# Re-run to toggle optional rule docs. Phase 0c dispatches on the number
# of optional rules: N=0 skips the prompt, N=1 shows a single-select Yes/No,
# N>=2 shows a multi-select checkbox where the "[ON]" label prefix marks
# already-applied items. AskUserQuestion cannot pre-check options — in the
# N>=2 case you MUST re-select every item you want to keep applied;
# unchecked optional items are removed.

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
- Required rule docs (manifest `required: true`) are always auto-applied — they NEVER appear in the prompt UI and the user cannot opt out
- Session hooks never touch `.claude/rules/` or `.filid/config.json`
- Organ directories must never receive an INTENT.md
- INTENT.md must not exceed 50 lines
- All three boundary sections are required in every INTENT.md
- Existing INTENT.md files are preserved, never overwritten
