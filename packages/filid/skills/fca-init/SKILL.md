---
name: fca-init
user_invocable: true
description: Initialize the FCA-AI fractal context architecture in a project by scanning the directory tree, classifying every directory as fractal, organ, or pure-function, and generating missing INTENT.md and DETAIL.md files. Use when starting a new project, onboarding an existing codebase, regenerating INTENT.md files after a large refactor, or auditing directory classifications before running fca-scan.
version: "1.0.0"
complexity: medium
plugin: filid
---

> **EXECUTION MODEL**: Execute all phases as a SINGLE CONTINUOUS OPERATION.
> After each phase completes, IMMEDIATELY proceed to the next.
> NEVER yield the turn after an MCP tool call returns or between phases.
> Large tool responses (e.g., fractal_scan) are internal working data —
> do NOT summarize them to the user. Skip phases with no work silently.

# fca-init — FCA-AI Initialization

Initialize the FCA-AI fractal context architecture in a project. Scans the
directory tree, classifies every directory by node type, generates missing
INTENT.md files for fractal nodes, and produces a validation report.

> **Detail Reference**: For detailed workflow steps, MCP tool examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

## When to Use This Skill

- Starting a new project that will follow FCA-AI conventions
- Onboarding an existing codebase into the fractal context system
- Regenerating INTENT.md files after a large-scale refactor removed them
- Creating DETAIL.md scaffolds for modules that lack formal specifications
- Auditing which directories are correctly classified before running `/filid:fca-scan`

## Prerequisites — Environment Check

Before starting the main workflow, check ast-grep availability by calling
`ast_grep_search` with a trivial pattern (e.g., `pattern: "$X"`, `language: "typescript"`, `path: "."`).

- **Available**: Proceed silently — no message needed.
- **Unavailable** (response contains "@ast-grep/napi is not available"):
  Display a non-blocking informational message and continue:
  ```
  [INFO] ast-grep이 설치되지 않았습니다.
  AST 패턴 매칭 기능을 사용하려면: npm install -g @ast-grep/napi
  (선택사항 — 설치 없이도 fca-init은 정상 동작합니다)
  ```
  The absence of ast-grep does NOT block any phase below.

## Core Workflow

### Phase 0 — Environment Setup

Before scanning, call the `project_init` MCP tool to set up FCA-AI infrastructure:

```
project_init({ path: "<target-path>" })
```

This creates:
- `.filid/config.json` — default rule configuration (all 8 built-in rules enabled)
- `.claude/rules/fca.md` — FCA architecture and rules guide (loaded natively by Claude Code)

Existing files are never overwritten. See [reference.md Section 0](./reference.md#section-0--environment-setup-details).

> **Note**: `.filid/config.json` and `.claude/rules/fca.md` should be committed to version control.
> `.filid/review/` and `.filid/cache/` should be gitignored (transient data).

**→ After `project_init` completes, immediately proceed to Phase 1.**

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

Validate all generated files against FCA-AI rules and emit a summary report.
See [reference.md Section 5](./reference.md#section-5--validation-and-report-format).

**After printing the summary report, execution is COMPLETE. Do not ask the user any follow-up questions.**

## Available MCP Tools

| Tool               | Action     | Purpose                                                        |
| ------------------ | ---------- | -------------------------------------------------------------- |
| `project_init`     | —          | Initialize .filid/config.json and .claude/rules/fca.md (Phase 0) |
| `fractal_scan`     | —          | Scan filesystem and retrieve complete project directory hierarchy |
| `fractal_navigate` | `classify` | Classify a single directory as fractal / organ / pure-function |
| `ast_grep_search`  | —          | AST pattern matching (optional — requires @ast-grep/napi)      |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well.

```
/filid:fca-init [path]
```

| Parameter | Type   | Default                   | Description                  |
| --------- | ------ | ------------------------- | ---------------------------- |
| `path`    | string | Current working directory | Root directory to initialize |

## Quick Reference

```bash
# Initialize current project
/filid:fca-init

# Initialize a specific sub-directory
/filid:fca-init src/payments

# Constants
KNOWN_ORGAN_DIR_NAMES (UI/shared)  = components | utils | types | hooks | helpers
                                     | lib | styles | assets | constants
KNOWN_ORGAN_DIR_NAMES (test/infra) = __tests__ | __mocks__ | __fixtures__
                                     | test | tests | spec | specs | fixtures | e2e
CLAUDE_MD_LIMIT   = 50 lines
3-TIER SECTIONS   = "Always do" | "Ask first" | "Never do"
DEEP_SCAN_RULE    = fractal nodes inside organ dirs are targets (iterate full tree.nodes)
```

Key rules:

- Organ directories must never receive a INTENT.md
- INTENT.md must not exceed 50 lines
- All three boundary sections are required in every INTENT.md
- Existing INTENT.md files are preserved, never overwritten
