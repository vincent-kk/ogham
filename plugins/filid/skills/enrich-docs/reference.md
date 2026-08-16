# enrich-docs — Reference Documentation

Detailed evidence, approval, editing, and validation contract for [SKILL.md](./SKILL.md).

## Section 1 — Project Evidence

Resolve the requested path without assuming a path separator, confirm that it is inside a project containing `.filid/config.json`, and call:

```text
mcp__plugin_filid_tools__fractal_scan({
  path: "<target-path>",
  detail: "paths",
  maxDepth: <optional --depth value>
})
```

The skill's `--depth` flag maps to the tool's `maxDepth` input — the flag keeps its short name, the tool input says what it does.

The response is a common Filid envelope. Stop before editing when `status` is not `ok`; report its diagnostics instead of treating incomplete adapter evidence as a clean snapshot.

The snapshot tree is always built to full depth — `maxDepth` sets the `max-depth` rule threshold, not a traversal limit — so on a large project this payload can exceed the inline envelope budget, in which case it is persisted and `data` is not inline. Treat a returned artifact as the canonical full payload for this call and read the node projection from it; an absent inline `data` is never an empty candidate set.

Use `data.nodes` as the authoritative candidate set. Each node contains its normalized path, classification, INTENT/DETAIL presence, and entry-point count. Exclude `organ` nodes because they must not own INTENT.md. A fractal or hybrid node without INTENT.md is `MISSING`.

For every existing or missing document candidate, call:

```text
mcp__plugin_filid_tools__context_resolve({
  path: "<project-path>",
  targetPath: "<node-path>"
})
```

`context_resolve` returns document references, not document bodies. Read only:

- the target INTENT.md or DETAIL.md when present;
- the owner-to-root `data.chain` document paths;
- `data.nearestDetailPath` when present;
- the target entry point and at most five other implementation files needed to understand the module.

Do not read sibling subtrees or an inline full project tree. Record the `snapshotHash` from the scan summary and the resolved output language for the plan and final report.

## Section 2 — Quality Audit

Score INTENT.md on four independent 25-point axes:

| Axis          | Evidence                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------ |
| Purpose       | A concrete ownership claim — what this fractal owns and what it refuses                    |
| Conventions   | Concrete module-specific decision rules                                                    |
| Boundaries    | Non-boilerplate Always/Ask/Never clauses                                                   |
| Non-derivable | Only content tools cannot print — decisions, reasons, name traps; an inventory scores zero |

Classify the result:

```text
score >= min-quality    RICH
0 < score < min-quality SPARSE
document absent         MISSING
```

The default `min-quality` is 70. RICH documents are never edited.

When `--include-detail` is present, score DETAIL.md against the required section set in [`../.shared/detail-template.md`](../.shared/detail-template.md). DETAIL.md has no line cap, but every edit must restructure it as the current contract rather than append history.

## Section 3 — Edit Plan

Create one plan item per SPARSE or MISSING document:

```text
docPath
nodePath
kind: sparse | missing
currentScore
sectionsToRewrite
contextDocumentPaths
implementationPaths
snapshotHash
```

Every path in the plan must come from scan/context evidence or a direct child of the resolved node. Do not invent a module boundary or a missing-document target.

The plan summary includes classification totals, per-document sections, evidence paths, and the expected number of writes.

## Section 4 — Approval Gate

`--dry-run` prints the plan and ends without writes.

Without `--auto-approve`, ask for explicit approval after presenting the complete plan. `approve` continues, `modify` removes or narrows requested items and re-presents the plan, and `cancel` ends without writes. `--auto-approve` is explicit prior authorization for the displayed plan; it never permits writes outside that plan.

No LLM document edit may begin before this gate has passed.

## Section 5 — LLM Document Edits

For each approved item, give the LLM writer:

- the exact target path and approved sections;
- current target content or `MISSING`;
- the resolved owner-to-root document content;
- the bounded implementation evidence;
- output language and snapshot hash.

For INTENT.md, preserve the English anchors and the 50-line cap defined in [`../.shared/intent-template.md`](../.shared/intent-template.md).

For every document, the writer introduces no derivable content: no file or directory inventories, no export or dependency rosters, no counts of these. A path the contract genuinely needs carries its reason beside it.

Body text follows the resolved project language. For a public-boundary change, update INTENT.md before implementation; for all contract changes, update DETAIL.md before implementation. This workflow edits only the approved documents and does not move source files.

## Section 6 — Validation

Validate each edited INTENT.md directly before invoking Filid:

1. line count is at most 50;
2. all English anchors are present;
3. the edit introduces no derivable enumeration — no file, export or dependency inventory — and any path token it keeps exists in the evidence read for the edit;
4. no unapproved document changed.

Validate each edited DETAIL.md against the required section set in [`../.shared/detail-template.md`](../.shared/detail-template.md).

Then call:

```text
mcp__plugin_filid_tools__structure_validate({
  path: "<target-path>",
  mode: "project",
  scopes: ["documents", "nodes"]
})
```

Read the findings from the returned result or, when the payload is persisted, from its artifact. This call decides whether an edited document is reverted, so treating an absent inline `data` as "no findings" would silently keep a failed edit.

A non-`ok` status, diagnostic, or finding affecting an edited document is not a pass. Revert that document to its captured pre-edit content and mark it `NEEDS_REWORK`. An INTENT.md over 50 lines gets one bounded compression retry; the retry may reorganize prose but may not drop an approved contract clause.

## Section 7 — Report

Report project path, snapshot hash, classification totals, approval mode, before/after line counts, sections rewritten, evidence paths, validation status, and reverted items. End with exactly one terminal marker:

- `Enrich-docs complete: <N> files enriched`
- `Enrich-docs dry-run complete`
- `Enrich-docs skipped: all RICH`
- `Enrich-docs cancelled`
