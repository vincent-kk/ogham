---
name: enrich-docs
user-invocable: true
description: '[filid:enrich-docs] Improve INTENT.md and DETAIL.md from snapshot-backed context evidence, with approval before LLM edits and structural validation afterward.'
argument-hint: '[path] [--depth N] [--min-quality 0-100] [--dry-run] [--auto-approve] [--include-detail]'
version: '1.0.0'
complexity: complex
plugin: filid
---

# enrich-docs — Evidence-backed Contract Enrichment

Audit documentation quality under a target path, present a bounded edit plan, obtain approval, let the LLM edit only that plan, and validate the result.

## Resource Index

| File                                                        | Purpose                                           |
| ----------------------------------------------------------- | ------------------------------------------------- |
| [reference.md](./reference.md)                              | Evidence, approval, edit, and validation contract |
| [tables.md](./tables.md)                                    | Tool and option lookup                            |
| [examples.md](./examples.md)                                | Invocation and report examples                    |
| [.shared/intent-template.md](../.shared/intent-template.md) | INTENT.md heading set, cap, and rules             |
| [.shared/detail-template.md](../.shared/detail-template.md) | DETAIL.md required sections and acceptance groups |

## When to Use

- INTENT.md is missing, boilerplate, or no longer describes its module.
- DETAIL.md does not express the current public contract.
- Documentation needs stronger evidence before `context-query` or `cross-review`.

This skill changes documents only. It does not move source files or alter public code.

## Workflow

### 1. Build snapshot evidence

Call `fractal_scan` with `detail: "paths"` for the target. Use returned node paths and classifications as the candidate inventory. Stop on non-`ok` status; do not interpret unsupported or indeterminate evidence as a clean audit.

### 2. Resolve minimal context

Call `context_resolve` for each candidate. Read only the returned owner-to-root INTENT/DETAIL references, nearest DETAIL, target document, entry point, and a bounded set of implementation files. Exclude organ nodes.

### 3. Audit and plan

Classify documents as RICH, SPARSE, or MISSING using the rubric in [reference.md](./reference.md). RICH documents remain untouched. Every proposed edit lists its sections and the exact evidence paths that support it.

### 4. Obtain approval

Show the complete plan before any LLM edit. `--dry-run` ends here without writes. Otherwise require approval unless `--auto-approve` supplied prior authorization for the displayed bounded plan. A modified plan is shown again.

### 5. Edit approved documents

The LLM edits only approved INTENT.md/DETAIL.md targets using the captured context. INTENT.md keeps the required English headings and 50-line cap; body language follows `context_resolve`. DETAIL.md is restructured as the current contract rather than appended to.

### 6. Validate and report

Check document anchors and line counts directly, then call `structure_validate` in `project` mode with `documents` and `nodes` scopes. Revert an edited file when its validation is non-`ok` or produces a relevant finding. Report evidence, before/after counts, and validation outcomes.

## Non-negotiable Rules

- Snapshot and context paths are the source of truth for edit scope.
- No LLM document write occurs before approval.
- RICH and unapproved files are never rewritten.
- INTENT.md stays within 50 lines with all three boundary tiers.
- Derivable content (file, export, or dependency inventories) is never written into documents.
- Diagnostic or non-exact evidence stays visible; it is not a pass.
