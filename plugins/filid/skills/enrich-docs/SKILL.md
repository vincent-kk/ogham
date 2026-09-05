---
name: enrich-docs
user-invocable: true
description: 'Audit, enrich, and repair INTENT.md and DETAIL.md from document evidence, with approval before edits and validation after. Use for missing, sparse, or stale module documents, including merge-track preparation and review refinement.'
argument-hint: '[path] [--depth N] [--min-quality 0-100] [--dry-run] [--auto-approve] [--include-detail] [--repair]'
version: '2.0.0'
complexity: complex
plugin: filid
---

# enrich-docs — Evidence-backed Contract Enrichment

Improve only INTENT.md/DETAIL.md, without changing source code, under one contract for `pull-request` Stage 1 foundation work, `resolve` refinement, and standalone audits. Execute as Tier-2b: continue after tool returns in the same turn, pausing only at the approval gate.

## Contract

| Option | Default | Meaning |
| --- | --- | --- |
| `path` | cwd | Directory to audit or an INTENT.md/DETAIL.md file to refine |
| `--depth` | configured `structure.maxDepth`, otherwise `10` | Maps to `maxDepth`, a rule threshold, not a traversal limit |
| `--min-quality` | `70` | RICH/SPARSE threshold, integer 0–100 |
| `--dry-run` | off | Show the plan without writes |
| `--auto-approve` | off | Authorize the displayed bounded plan |
| `--include-detail` | off | Audit DETAIL.md and draft it when missing |
| `--repair` | off | Plan document findings regardless of quality score |

Report project path, snapshot hash, classifications, approval mode, before/after line counts, rewritten sections, evidence paths, per-document validation, and reverted items; then `Repaired: <n>`, `Relocated: <n>`, `Needs rework: <k>`, `Deferred: <m>` in that order, deferred rows, and `Diagnostics` ([§7](./reference.md#7-report)). End with exactly one marker:

- `Enrich-docs complete: <N> files enriched`
- `Enrich-docs dry-run complete`
- `Enrich-docs skipped: all RICH`
- `Enrich-docs cancelled`
- `Enrich-docs failed: <reason>`

Invariants:

- No document writes before approval; unapproved files remain unchanged.
- RICH content is editable only with `--repair`, within finding-named ranges.
- Plan one item per SPARSE or MISSING document and per REPAIR candidate; coalesce findings for the same document.
- Never add derivable file, export, or dependency inventories or their counts.
- INTENT.md keeps the English anchors, all three boundary tiers, and the 50-line cap.
- Evidence explicitly marked `indeterminate` or `unsupported` is not a pass or an edit basis; deterministic document findings need no certainty field.
- Failures apply per document, or per relocation pair; other approved documents continue.
- Do not move source files or change code.

## Workflow

1. **Gather evidence.** Call `scan` with `detail: "full"`; candidate nodes' `documentEvidence.findings` supply repair input, and the envelope `status` is not an edit gate. Recover artifacts and retry failed owners as [§1](./reference.md#1-tool-calls-and-evidence) specifies.

2. **Resolve context.** Call one `fractal_inspect` `resolve` batch with ordered candidate requests. Read only the resolved document chain, target, entry point, and bounded implementation evidence in [§1](./reference.md#1-tool-calls-and-evidence).

3. **Classify and plan.** Apply RICH/SPARSE/MISSING and REPAIR rules, including missing DETAIL.md, from [§2](./reference.md#2-classification). Show sections, findings, evidence, and any predicted INTENT-to-DETAIL relocation in the [§3 plan](./reference.md#3-plan-items).

4. **Obtain approval.** Display the complete plan and apply `approve`, `modify`, `cancel`, or the invocation flags at [§4](./reference.md#4-approval). A widened relocation plan is displayed before writes even with `--auto-approve`.

5. **Edit the approved scope.** Apply the templates, finding-specific repair ranges, and relocation rules in [§5](./reference.md#5-editing). Capture pre-edit content and preserve every approved contract clause.

6. **Validate and report.** Perform direct checks, then `validate` with `scopes: ["documents", "nodes"]`, judging each edited document by its own findings and reverting affected items under [§6](./reference.md#6-validation). Continue the remaining documents and emit the [§7 report](./reference.md#7-report).

## Stop conditions

- Approval `cancel`: emit `Enrich-docs cancelled`; this marker means approval was declined.
- No candidates because all documents are RICH and no repair item exists: emit `Enrich-docs skipped: all RICH`.
- A scan or validation failure leaves no document evaluable after owner-path retries: emit `Enrich-docs failed: <reason>`.

Otherwise hold only unevaluable documents, retain their diagnostics, and continue.
