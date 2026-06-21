# Craft Skill Reference

> Reference for craft-skill. Adapted from the skill-constructor concept; trimmed for maencof standalone use.

Detailed processes, decision logic, and quality rules for the four operating modes. The model performs mode detection, complexity scoring, and structure layout inline; `node scripts/enhanced_validator.mjs <skill-path>` is the one bundled deterministic gate. Skills deploy by copying their directory — there is no packaging or zip step.

The pseudocode below illustrates the decision logic; it is not code to execute.

---

## Table of Contents

1. [Mode Workflows](#1-mode-workflows)
   - 1.1 [CREATE Mode](#11-create-mode)
   - 1.2 [REFACTOR Mode](#12-refactor-mode)
   - 1.3 [IMPROVE Mode](#13-improve-mode)
   - 1.4 [FIX Mode](#14-fix-mode)
2. [Complexity Evaluation](#2-complexity-evaluation)
   - 2.1 [Formula & Scoring](#21-formula--scoring)
   - 2.2 [Worked Examples](#22-worked-examples)
   - 2.3 [Threshold Behavior](#23-threshold-behavior)
3. [Validation System](#3-validation-system)
   - 3.1 [Checklist](#31-checklist)
   - 3.2 [Error Handling](#32-error-handling)
   - 3.3 [Recovery Strategies](#33-recovery-strategies)
4. [Version Management](#4-version-management)
5. [Best Practices](#5-best-practices)
   - 5.1 [Progressive Disclosure](#51-progressive-disclosure)
   - 5.2 [Resource Organization](#52-resource-organization)
   - 5.3 [Documentation Quality](#53-documentation-quality)

---

## 1. Mode Workflows

### 1.1 CREATE Mode

Build a new skill from scratch.

#### Phase 0: Mode Detection

Decide CREATE inline from the request and whether a target skill already exists:

```
IF no existing skill THEN CREATE (high confidence)
IF request contains "create" / "new skill" / "build" / "initialize" THEN CREATE
ELSE consider REFACTOR / IMPROVE / FIX
```

#### Phase 1: Requirements Discovery

Discover requirements through concrete usage examples. Ask:

1. "What should this skill do? Give 3-5 concrete examples."
2. "What situations should trigger it?"
3. "What would a user say that should invoke it?"

Collect at least three examples, each with clear input/output, covering diverse scenarios. For each example, decide what reusable resources are warranted:

- Repetitive or reliability-critical work → a bundled `scripts/*.mjs` candidate.
- Domain knowledge, schemas, or API docs → a `reference.md` (or `references/`) candidate.
- Templates or boilerplate output → an `assets/` candidate.

Output: a requirements summary and a resource plan.

#### Phase 2: Complexity Evaluation

Score complexity inline using the formula in [Section 2](#2-complexity-evaluation), then map the score to a category (simple / medium / complex) that drives the structure.

#### Phase 3: Structure Generation

Lay out the directory inline based on the category.

**Simple (score < 0.4):**

```
skill-name/
├── SKILL.md (2-3k words)
└── scripts/ (1-2 files)
    └── example.mjs
```

**Medium (score 0.4-0.7):**

```
skill-name/
├── SKILL.md (3-4k words)
├── reference.md
├── examples.md
└── scripts/ (3-5 files)
    ├── one.mjs
    ├── two.mjs
    └── three.mjs
```

**Complex (score > 0.7):**

```
skill-name/
├── SKILL.md (4-5k words, compressed)
├── reference.md
├── examples.md
└── scripts/ (5-7+ files, optionally grouped into subdirectories)
```

A complex skill MAY additionally carry deeper topic docs or supplementary references when the domain genuinely needs them — add them only when warranted, not by default.

#### Phase 4: Implementation

**Step 4.1 — Bundled resources.** For each script: write ESM (`.mjs`) with a `#!/usr/bin/env node` shebang, import Node built-ins, document usage in a header comment, and handle errors. For each reference doc: clear heading structure, searchable keywords, concrete examples. For each asset: ready-to-use format, descriptive file name, documented in SKILL.md or reference.md.

**Step 4.2 — Determine `argument-hint`.** Before writing frontmatter:

```
IF the body references $ARGUMENTS / $0 / $1 / $ARGUMENTS[N] THEN argument-hint REQUIRED
ELSE IF the skill supports subcommands, modes, or run-IDs        THEN argument-hint REQUIRED
ELSE argument-hint MAY be omitted
```

Notation conventions:

| Notation  | Meaning             | Example                                 |
| --------- | ------------------- | --------------------------------------- |
| `<value>` | Required positional | `<issue-number>`                        |
| `[value]` | Optional positional | `[filename]`                            |
| `a \| b`  | Mutually exclusive  | `list \| status`                        |
| `--flag`  | Optional flag       | `--verbose`                             |
| Combined  | Mix as needed       | `[list \| <run-id> \| resume <run-id>]` |

**Step 4.3 — Write SKILL.md.** Structure:

```markdown
---
name: skill-name
description: [specific trigger scenarios, 20-250 chars]
argument-hint: [from Step 4.2 if applicable]
---

# Skill Name

## Quick Start

[2-3 sentence overview]

## When to Use This Skill

[Specific trigger scenarios - bulleted]

## Core Workflow

[2-7 steps; Medium/Complex link out to reference.md]

## Resources

### scripts/

### reference.md (Medium/Complex)

### examples.md (Medium/Complex)

## Quick Reference

[Cheat sheet]
```

Size targets: Simple 2-3k, Medium 3-4k, Complex 4-5k words (compressed, with reference links).

**Step 4.4 — Supporting docs (Medium/Complex).** `reference.md` carries detailed workflows, algorithms, and any API surface; `examples.md` carries 3-10 worked examples (requirements → execution → output).

#### Phase 5: Validation

Run the deterministic gate:

```
node scripts/enhanced_validator.mjs <skill-directory> [--strict]
```

It checks frontmatter, naming, description quality, SKILL.md size, resource references, script shebangs/syntax, and organization (see [Section 3](#3-validation-system)). If it fails, fix issues in Phase 4 and re-run.

#### Phase 6: Finalize

No packaging step. Confirm the directory is complete and self-consistent, then deploy by copying the skill directory into the target skills location. Summarize what was built for the user.

---

### 1.2 REFACTOR Mode

Improve an existing skill's structure while preserving behavior.

#### Phase 0: Mode Detection

```
IF request contains "refactor" / "restructure" THEN REFACTOR (high confidence)
IF "reorganize" AND skill exists               THEN REFACTOR
IF SKILL.md > 5000 words                       THEN SUGGEST REFACTOR
```

#### Phase 1: Current Structure Analysis

Read the skill and identify structural issues:

- **Oversized SKILL.md** (> 5000 words) → extract detailed content to `reference.md`. Severity: high.
- **Missing layer separation** (> 3000 words, no `reference.md`) → create `reference.md`. Severity: medium.
- **Unorganized scripts** (> 7 flat files) → group `scripts/` into subdirectories. Severity: medium.
- **Missing examples** (complexity > 0.4, no `examples.md`) → create `examples.md`. Severity: low.

#### Phase 2: Refactoring Plan

Generate a diff-style plan and get explicit user approval before touching files:

```diff
Refactoring Plan: api-client-builder
====================================

Files to CREATE:
+ reference.md   (detailed workflows extracted from SKILL.md)
+ examples.md    (inline examples + new worked examples)

Files to MODIFY:
M SKILL.md       (remove extracted sections, add Resources index, compress to overview)

Files to MOVE / DELETE:
→ scripts/validator.mjs → scripts/validation/validator.mjs
× scripts/deprecated.mjs (no longer used)

Impact:
- SKILL.md: 12,500 -> 4,200 words (~66% smaller initial load)
- Progressive disclosure: enabled
- Behavior / script APIs: unchanged

Approve? (yes/no)
```

If the user declines, gather feedback, revise, and re-present.

#### Phase 3: Diff-based Transformation

Execute the approved plan: create the new files from extracted content, modify SKILL.md, move/delete files, then update all cross-references. Work surgically so existing scripts and triggers stay intact. Because skills are plain directories, a quick copy of the directory before transforming gives a trivial rollback path.

#### Phase 4: Validation & Testing

```
node scripts/enhanced_validator.mjs <skill-path> --strict
```

Confirm: SKILL.md within limit, referenced files exist, all cross-references resolve, scripts unchanged in behavior.

#### Phase 5: Impact Analysis

Report the before/after deltas that matter: SKILL.md size reduction, progressive-disclosure gain (content now deferred to reference/examples), and confirmation that behavior is unchanged. Keep it factual — measured word counts, not invented load-time figures.

#### Phase 6: Finalize

Summarize the structural changes for the user. Deploy by copying the directory.

---

### 1.3 IMPROVE Mode

Add features or capabilities while keeping backward compatibility.

#### Phase 0: Mode Detection

Triggers: "improve", "add feature", "enhance", "extend", "upgrade".

#### Phase 1: Enhancement Analysis

Parse the enhancement request, survey existing features, find extension points, and estimate the complexity change. If the projected category differs from the current one, the structure may need to grow (e.g. add `reference.md` when crossing into Medium).

#### Phase 2: Feature Planning

Design the integration: which new scripts/references/assets are needed, which SKILL.md sections change, and whether anything breaks backward compatibility. If the projected SKILL.md would exceed 5000 words, plan to move overflow into `reference.md`.

#### Phase 3: Incremental Implementation

Add new resources, update SKILL.md sections, and keep SKILL.md under the size limit (extract overflow to `reference.md`). Bump the version (see [Section 4](#4-version-management)).

#### Phase 4: Integration Validation

Exercise both new and existing features, validate the docs, and re-check complexity. If the category jumped, suggest a follow-up REFACTOR.

#### Phase 5: Version Management

Choose the increment from the change analysis (major for breaking, minor for new features, patch for fixes) and update the changelog. See [Section 4](#4-version-management).

#### Phase 6: Finalize

Note the new capabilities and any backward-compatibility caveats for the user. Deploy by copying the directory.

---

### 1.4 FIX Mode

Repair a bug with the smallest viable change.

#### Phase 0: Mode Detection

Triggers: "fix", "bug", "issue", "error", "broken", "debug", "resolve".

#### Phase 1: Issue Diagnosis

Understand the report, locate the problem, and identify the root cause. Common root-cause types: script logic error, documentation inaccuracy, broken resource reference, validation-rule issue, missing file, incorrect configuration. Fix the cause, not the symptom.

#### Phase 2: Minimal Fix Design

Design the smallest change that resolves the root cause. Guard against scope creep — keep the change to as few files as possible (a single file is typical) and preserve all surrounding behavior.

#### Phase 3: Targeted Implementation

Apply the fix at the declaration site of the defect. Bump the patch version.

#### Phase 4: Regression Testing

Verify the fixed behavior, confirm unchanged behavior elsewhere, run the validator, and check for side effects.

#### Phase 5: Documentation Update

Update only the docs the fix affects (and the changelog).

#### Phase 6: Finalize

Confirm the fix and its narrow surface area for the user. Deploy by copying the directory.

---

## 2. Complexity Evaluation

### 2.1 Formula & Scoring

Score a skill from its component counts:

```
file_score        = min(file_count / 20, 1.0)
mcp_score         = 1.0 if mcp_integration else 0.0
workflow_score    = min(workflow_steps / 10, 1.0)
conditional_score = min(conditionals / 15, 1.0)
deps_score        = min(external_deps / 5, 1.0)

complexity = file_score*0.3 + mcp_score*0.2 + workflow_score*0.1
           + conditional_score*0.15 + deps_score*0.25
```

Category:

```
complexity < 0.4  -> simple
complexity < 0.7  -> medium
else              -> complex
```

Component meaning and weights:

| Component       | Weight | Measurement                   | 1.0 at      |
| --------------- | ------ | ----------------------------- | ----------- |
| file_count      | 0.30   | scripts + references + assets | 20 files    |
| mcp_integration | 0.20   | uses an MCP server (0/1)      | present     |
| workflow_steps  | 0.10   | main workflow steps           | 10 steps    |
| conditionals    | 0.15   | decision branch points        | 15 branches |
| external_deps   | 0.25   | external libs/tools           | 5 deps      |

### 2.2 Worked Examples

**Simple — image-rotator (~0.28):** 3 files, no MCP, 2 steps, 2 conditionals, 1 dep. Raw weighted sum is small (≈0.14); after the usage-pattern adjustment it lands ≈0.28 → **simple** → SKILL.md + 1-2 scripts.

**Medium — api-client-builder (~0.52):** 8 files, no MCP, 5 steps, 7 conditionals, 3 deps → ≈0.39 raw, ≈0.52 adjusted → **medium** → SKILL.md + reference.md + examples.md + ~5 scripts.

**Complex — full-stack-generator (~0.81):** 18 files, MCP, 8 steps, 12 conditionals, 6 deps (capped) → ≈0.92 raw, normalized ≈0.81 → **complex** → full hierarchy with grouped scripts and, where warranted, deeper topic docs.

The raw sum is a guide, not a verdict — treat scores near a boundary as a prompt to decide deliberately (Section 2.3).

### 2.3 Threshold Behavior

| Score      | Category | SKILL.md target | Supporting docs            |
| ---------- | -------- | --------------- | -------------------------- |
| 0.0 - 0.39 | Simple   | 2-3k words      | none, or reference.md only |
| 0.4 - 0.69 | Medium   | 3-4k words      | reference.md + examples.md |
| 0.7 - 1.0+ | Complex  | 4-5k words      | full hierarchy             |

**Simple → Medium (crossing 0.4):** add `reference.md` and `examples.md`, raise the SKILL.md target, and expect 3-5 scripts.

**Medium → Complex (crossing 0.7):** compress SKILL.md, group `scripts/` into subdirectories, expand examples, and add deeper topic docs where the domain warrants.

**Boundary handling:** at ≈0.39-0.41, prefer Medium if expansion is likely, Simple otherwise. At ≈0.69-0.71, prefer Complex if complexity is trending up, Medium if stable. When decreasing (a refactor that lowers the score), it is fine to keep an already-established richer structure rather than tear it down.

---

## 3. Validation System

`node scripts/enhanced_validator.mjs <skill-path> [--strict]` runs these checks.

### 3.1 Checklist

**A. YAML frontmatter**

1. Starts with `---`.
2. `name:` and `description:` present.
3. Name is hyphen-case `^[a-z0-9-]+$`, no leading/trailing or consecutive hyphens.
4. Frontmatter name matches the directory name.
5. Description ≥ 20 chars, no angle brackets `< >`, includes trigger scenarios.
6. `argument-hint` present if the body references `$ARGUMENTS` / `$0` / `$1`, using correct notation.

**B. File structure**

7. `SKILL.md` exists.
8. SKILL.md ≤ 5000 words (warning when approaching the limit).
9. `scripts/` exists or its absence is justified.
10. Scripts are runnable Node ESM with a `#!/usr/bin/env node` shebang and valid syntax.

**C. Content quality**

11. Referenced files actually exist (reference.md, examples.md, and any others the SKILL.md names).
12. No `TODO` / `FIXME` / `XXX` placeholders in production files.
13. If `examples.md` exists, it has ≥ 3 complete examples.

**D. Organization**

14. Proper directory hierarchy; no misplaced files.
15. Scripts live in `scripts/`, references and assets in their own directories.
16. No content duplicated across SKILL.md and reference.md.

> The validator inspects whatever skill directory it is pointed at and reports on structures that target skill happens to have (including any `references/`, `assets/`, or deeper topic directories). That is expected — it validates arbitrary skills, not just this one.

### 3.2 Error Handling

Severities: **error** (blocks completion), **warning** (allowed but flagged), **info**.

Blocking errors include: SKILL.md missing, invalid frontmatter, missing required field, SKILL.md over 5000 words, a referenced file that does not exist. Warnings (short description, no `scripts/`, missing shebang, approaching size limit) are surfaced; proceed only after the user acknowledges them.

```
Run validator
   │
   ├─ errors?  ── yes ─► FAIL: report and block until fixed
   │
   └─ no ─► warnings? ── yes ─► WARN: surface and confirm
                        └─ no ─► PASS
```

### 3.3 Recovery Strategies

1. **Targeted fixes for mechanical issues.** Add a missing shebang, add a missing `complexity` field, extract an oversized SKILL.md into `reference.md`, or generate a missing `examples.md` from inline content. Apply with the user's confirmation, then re-validate.
2. **Guided manual fixes** for judgment calls — invalid name format (rename and update frontmatter), short description (add concrete triggers and capabilities), missing resource file (create it, or remove/fix the reference).
3. **Iterative refinement.** Validate → fix the highest-severity issues → re-validate, looping until clean. Track which issues were resolved each pass so progress is visible and stalls are obvious.
4. **Bypass only with justification** (`--strict` off allows warnings) for development or a suspected validator bug — never as the normal path.

---

## 4. Version Management

Use Semantic Versioning (MAJOR.MINOR.PATCH) and a changelog; rely on git tags and `CHANGELOG.md` rather than bespoke metadata files.

Pick the increment from the change analysis:

- **MAJOR** — breaking change: workflow changed, feature removed, incompatible API change, new required field.
- **MINOR** — new feature, backward compatible: new scripts/modes, enhanced functionality.
- **PATCH** — bug fix: documentation correction, script bugfix, validation fix.

Changelog entries follow [Keep a Changelog](https://keepachangelog.com/) — group changes under Added / Changed / Deprecated / Removed / Fixed / Security, mark breaking items explicitly, and prepend new entries:

```markdown
## [2.1.0] - 2026-02-12

### Added

- IMPROVE mode workflow
- examples.md with worked examples

### Changed

- Restructured SKILL.md to under 5k words; detailed workflows moved to reference.md
```

Tag releases with git:

```bash
git tag -a v2.1.0 -m "Release v2.1.0"
```

---

## 5. Best Practices

### 5.1 Progressive Disclosure

Three loading layers keep context lean.

**Layer 1 — Metadata (~100 words, always loaded):** the YAML frontmatter. Keep the description 20-250 chars, with specific triggers, core capabilities, and searchable keywords.

**Layer 2 — SKILL.md body (< 5k words, loaded when triggered):** Quick Start, When to Use, Core Workflow (linking out for detail), Resources index, Quick Reference. Rough budgets: Simple ≈1.5k words, Medium ≈2.5k, Complex ≈4k.

**Layer 3 — Bundled resources (on demand, unlimited):** `reference.md`, `examples.md`, and `scripts/`. The model loads a reference section or an example only when needed, and runs a script without reading its source.

When SKILL.md would exceed 5000 words, extract detailed workflows to `reference.md` and worked examples to `examples.md`, then compress the body to an overview that links the extracted content. Point readers at specific anchors rather than whole files:

```markdown
### Phase 2: Planning

Generate the implementation plan from requirements.
Details: reference.md > "Planning Phase". Example: examples.md > Example 2.
```

### 5.2 Resource Organization

**Separate by purpose:** `SKILL.md` (guide), `reference.md` (detail), `examples.md` (use cases), `scripts/` (executable Node), and — only when needed — `references/` (reference docs and schemas) and `assets/` (templates and output).

**Name for discovery:** file names reveal one concrete purpose (`rotate-pdf.mjs`, not `pdf-utils.mjs`; `database-schema.md`, not `info.md`). Mirror the naming style of sibling files. Keep directory pluralization consistent.

**Group logically and shallowly:** group scripts by function rather than by file type, and keep nesting to ~2-4 levels — neither one flat dumping file nor a five-level deep tree.

```
# Simple: flat
scripts/
├── rotate.mjs
└── flip.mjs

# Medium: grouped by function
scripts/
├── validation/validator.mjs
├── generation/generator.mjs
└── utils.mjs

# Complex: hierarchical, grouped
scripts/
├── core/{discovery,planning,execution}/
├── validation/
└── utils/
```

### 5.3 Documentation Quality

**Imperative/infinitive voice.** "To rotate an image, run `node scripts/transform.mjs image.png rotate 90`." — not "You should rotate images by…".

**Specific over generic.** List concrete triggers ("Converting PDFs to images", "Rotating PDF pages") rather than vague ones ("Working with files").

**Concrete examples.** Show the actual command and the resulting output path, not an abstract description of the capability.

**Description checklist** — every description states _what_ it does, _when_ to use it (specific triggers), and _how_ it helps (capabilities); keep it 20-250 chars and free of jargon.

**Section conventions.** SKILL.md: Quick Start, When to Use, Core Workflow, Resources (plus optional Quick Reference / Modes Overview / Configuration). reference.md: table of contents, detailed workflows, algorithms, configuration/API reference, advanced features. examples.md: per example, give Requirements → Workflow → Input → Output → Notes.

**Cross-references and script calls are concrete.** Link to a named section ("reference.md > CREATE Mode Workflow"), link external standards by URL, and show the exact command for a script (`node scripts/generate.mjs --spec api.yaml --output client/`) rather than telling the reader to "run the generator".

---

**End of Reference.** This document covers the four mode workflows, complexity evaluation, the validation system, version management, and best practices for craft-skill.
