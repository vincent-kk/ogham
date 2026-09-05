# enrich-docs — Reference

Evidence, planning, editing, and validation details for [SKILL.md](./SKILL.md).

## §1 Tool calls and evidence

Normalize the requested path inside a project containing `.filid/config.json`, then call:

```text
mcp__plugin_filid_tools__fractal_inspect({
  action: "scan",
  path: "<target-path>",
  detail: "full",
  maxDepth: <optional --depth value>
})
```

`--depth` maps to `maxDepth`, whose default is the project's `structure.maxDepth` or `10`. It sets the `max-depth` rule threshold; the snapshot always traverses the full tree.

Call `scan` with `detail: "full"`; each candidate node's `documentEvidence.findings` — `document`, `rule`, `section` (present for `derivable-content`, `derivable-structure` and `stale-path`), `message`, `severity` — is the only input for repair. The envelope `status` is not an edit gate: `indeterminate` there reports dependency, entry-point or verification uncertainty that has no bearing on document findings, which are deterministic. A candidate node without `documentEvidence`, or a scan whose data and artifact cannot be read, is the only thing that makes a document unevaluable; every non-finding diagnostic is carried verbatim under `Diagnostics` in the report and never converted into a pass or a stop.

All calls return the common Filid envelope. When inline `data` is absent, read the artifact's JSON data as the canonical full payload before using any fields; absence is never an empty candidate set or a clean validation. Full scans commonly use artifacts. Read candidate nodes at `data.snapshot.tree.nodes[]` and repair input at `data.snapshot.tree.nodes[].documentEvidence.findings`, using the same paths in the artifact. Do not use `validate`'s converted `RuleViolation` records for repair: they lose the document sub-rule and section.

Exclude organ nodes. A fractal or hybrid without INTENT.md is MISSING; document `ENOENT` means MISSING, while other document read errors propagate as scan failures. Keep non-finding diagnostics such as `config-warning`, adapter, dependency, and entry-point diagnostics verbatim.

When `path` names an INTENT.md or DETAIL.md file, scan its parent directory and plan that one document as SPARSE regardless of score; its sections come from the audit rubric, since the caller passes no per-item request. `resolve` routes a reviewer's `documentation` finding this way.

For the candidates, use this ordered batch shape:

```text
mcp__plugin_filid_tools__fractal_inspect({
  action: "resolve",
  path: "<project-path>",
  requests: [
    { targetPath: "<candidate node path 1>" },
    { targetPath: "<candidate node path 2>" }
  ]
})
```

Map each candidate to `data.results[index]`; order and cardinality match the requests. A failed result is held with its diagnostics, without guessing its owner. Resolve returns references, not document bodies. For each successful `result`, read only:

- the target INTENT.md/DETAIL.md, if present;
- owner-to-root document paths in `result.resolution.chain` and `result.resolution.nearestDetailPath`, if present;
- the target entry point and at most five implementation files needed to understand the module.

Do not read sibling subtrees or dump the inline full project tree. Record the scan summary's `snapshotHash` and each resolved `result.summary.outputLanguage` for the plan and report.

After artifact recovery, apply this failure rule: When a `scan` or `validate` call fails, its artifact cannot be read, or `data` is absent, retry once per owner path. A document whose owner path still cannot be evaluated is held with the diagnostic verbatim; when no document can be evaluated the run ends with `Enrich-docs failed: <reason>`.

## §2 Classification

Score INTENT.md on four independent 25-point axes:

| Axis | Evidence |
| --- | --- |
| Purpose | A concrete ownership claim — what this fractal owns and what it refuses |
| Conventions | Concrete module-specific decision rules |
| Boundaries | Non-boilerplate Always/Ask/Never clauses |
| Non-derivable | Only content tools cannot print — decisions, reasons, name traps; an inventory scores zero |

```text
score >= min-quality    RICH
0 <= score < min-quality SPARSE
document absent         MISSING
```

The default `min-quality` is 70. SPARSE or MISSING documents enter the plan. Without `--repair`, retain this quality-based behavior; an explicit document target uses the SPARSE override in §1. With `--include-detail`, score existing DETAIL.md against its required template sections; it has no line cap and expresses the current contract rather than appended history.

With `--repair`, a document that carries any `documentEvidence` finding — `derivable-content`, `derivable-structure`, `stale-path`, `line-limit`, `missing-boundaries`, `missing-field` — is a REPAIR candidate regardless of its score; `missing-document` stays MISSING. The edit range is the finding's `section` when present; otherwise the whole document for `line-limit`, the tiers the message names for `missing-boundaries`, and the exemption entry the message quotes for `missing-field`. Two findings are deferred instead of repaired: a `stale-path` whose token matches a `structure.generatedPaths` entry (the path exists at runtime; whether the rule should exempt it is a config decision), and a `missing-field` on a Boundary Exemption whose `Reason` is empty (the reason is a human claim, never generated). Deferred items appear in the report with the class `config-decision`.

The repair table in §5 distinguishes both `missing-field` variants and covers the remaining document rules. REPAIR is a plan kind over the quality classification, not another score interval. Findings explicitly marked with certainty `indeterminate` or `unsupported` remain reported evidence, never an edit basis or a pass; deterministic document findings arrive without a certainty field.

With `--include-detail`, a fractal or hybrid node without DETAIL.md is `MISSING` for DETAIL as well; its draft follows the required sections in [`../.shared/detail-template.md`](../.shared/detail-template.md) and states only acceptance criteria the evidence supports.

## §3 Plan items

Create one plan item per SPARSE or MISSING document and per REPAIR candidate, coalescing the same document's findings into one item:

```text
docPath
nodePath
kind: sparse | missing | repair
currentScore
findings
sectionsToRewrite
contextDocumentPaths
implementationPaths
snapshotHash
relocation: <both document paths and section sets, when needed>
```

Every path comes from scan/resolve evidence or a direct child of the resolved node. Do not invent a boundary or document target. Show classification totals, per-document sections, findings, evidence paths, and expected writes, including held items and their reasons.

A `repair` item's `sectionsToRewrite` is the finding's `section` when present, otherwise exactly the range the repair table names for that rule (the whole INTENT.md for `line-limit`, the missing tiers for `missing-boundaries`, the quoted exemption or acceptance heading for `missing-field`, the missing DETAIL section for `missing-section`, the duplicated group for `duplicate-id`); it never widens beyond that range.

A relocation is one plan item that names both documents and both section sets; when the audit predicts the cap will not hold, the item is planned and approved before any edit, and when the need appears only after editing, the plan is re-presented with the DETAIL.md target added (or, under `--auto-approve`, the relocation is applied and reported as such). The two documents validate together: a failure on either reverts both to their captured pre-edit content, so a moved clause is never lost.

## §4 Approval

`--dry-run` displays the plan and ends without writes. Otherwise present the complete plan before requesting `approve`, `modify`, or `cancel`.

<!-- [INTERACTIVE] -->

`approve` continues; `modify` removes or narrows items and re-presents the plan; `cancel` ends without writes. `--auto-approve` is prior authorization for the displayed plan only. It does not authorize unrelated files or sections.

Under `--auto-approve`, a relocation discovered after editing is still shown as the widened two-document plan before it is applied; the flag authorizes the displayed plan, so the display comes first even when no prompt opens.

## §5 Editing

Capture each approved target's pre-edit content, including its absence, and use only its approved sections, current content, resolved document chain, bounded implementation evidence, output language, and snapshot hash. Compare each finding's section, message token, and line with current content before editing; a mismatch means the document changed and the item is held as `needs-rework`. `section === ''` denotes the preamble before the first heading.

INTENT.md follows the English anchors, three boundary tiers, and cap in [`../.shared/intent-template.md`](../.shared/intent-template.md). DETAIL.md follows its shared template, restructures the current contract, and keeps decision history only in the conditional History section. Body language follows the resolved project language; headings, identifiers, paths, and rule IDs retain their required form.

For a `repair` item the writer removes what the finding names and nothing else: a derivable enumeration goes, a sentence that carries a reason beside its path stays, a stale token is removed or replaced with the existing path the surrounding evidence names, and a conditional section (`Structure`, `Dependencies`) emptied by the removal loses its heading.

| Document rule | Edit range and action | Deferral |
| --- | --- | --- |
| `derivable-content`, `derivable-structure` | Named section: remove enumeration tokens without reasons, preserve reason-bearing sentences, and remove an emptied conditional heading. | None |
| `stale-path` | Named section: remove the message's backticked token only if absent from the current tree and unmatched by `structure.generatedPaths`, or replace it with an existing path supported by the same paragraph. | A token matching `structure.generatedPaths`: `config-decision`; no edit |
| `line-limit` | Whole INTENT.md: one compression retry, then the paired relocation below. | Still over the cap after relocation: `needs-rework` |
| `missing-boundaries` | Missing tiers under `## Boundaries` named by the message: fill template anchors from evidence. | None |
| `missing-field` — `Boundary exemption "<targetPath>" has no reason` | The quoted exemption entry: leave its Reason unfilled. | Always `config-decision` |
| `missing-field` — acceptance heading/line error or absent groups | The message's heading/line or `## Acceptance Criteria`: normalize to `### <id> — <title>`; add an absent group skeleton only with support from spec-document contract markers or existing requirements. | Missing supporting evidence: `needs-rework` |
| `missing-section` | Missing required DETAIL section: fill the template section from evidence. | None |
| `duplicate-id` | Duplicated acceptance group: suffix the second and subsequent IDs named by the message to make them unique. | Choosing the canonical group requires judgment: `needs-rework`; no edit |
| `missing-document` | Whole document: follow the MISSING draft process; `document: detail` means a DETAIL draft. | None |

`append-only` is not generated by scan. Any document rule absent from this table is left unchanged and recorded as `needs-rework`.

An INTENT.md over 50 lines gets one bounded compression retry; the retry may reorganize prose but may not drop an approved contract clause. When the retry still exceeds 50 lines, relocate contract detail into DETAIL.md — API contracts, acceptance criteria, decision history — creating it from the template when absent, and keep Purpose, Conventions and the three boundary tiers in INTENT.md. A clause is moved, never dropped; count each move under `Relocated`.

The writer adds no unsupported claims: every new sentence traces to the evidence read for the edit, and a missing required section or field is filled from that evidence. A `kind: repair` item adds nothing beyond what its finding names. `sparse` and `missing` items — including a document named directly as `path` and re-audited as SPARSE regardless of score — follow the approved rubric-based plan and may add evidence-backed content.

Add no file or directory inventories, export or dependency rosters, or counts of these. A necessary path carries its reason beside it. This workflow edits approved documents only; contract documents lead any later implementation change by the caller.

## §6 Validation

Check edited documents directly:

1. INTENT.md is at most 50 lines, leaving the template's newline slack.
2. INTENT's English anchors and all three boundary tiers, and DETAIL's required sections, are present.
3. No derivable enumeration was introduced; every retained path token is supported by the evidence read for the edit.
4. No unapproved document changed.

For a cap failure, use §5's single compression retry and relocation process with §4's widened-plan approval before repeating these checks. If the cap still fails, revert the item and record `needs-rework`.

Then call:

```text
mcp__plugin_filid_tools__fractal_inspect({
  action: "validate",
  path: "<target-path>",
  scopes: ["documents", "nodes"]
})
```

Recover persisted data under §1 before inspecting findings. A finding or non-exact validation evidence affecting an edited document is not a pass: revert its captured pre-edit content, or remove its newly created draft, and mark it `needs-rework`. Apply the same rollback to both documents of a relocation as §3 requires.

A failed resolve item, a reverted edit, or a non-`ok` validation applies to that document alone — or to the document pair of a relocation — and the other approved documents continue. Judge each edited document by the findings that name its path, not by the envelope's overall `status`.

For a failed validation call or unreadable payload, use §1's once-per-owner retry before declaring failure. Revert and hold only the documents still unevaluable, retaining their diagnostics verbatim, and continue the other approved documents. A non-finding diagnostic alone does not fail an otherwise evaluated document.

## §7 Report

Report project path, snapshot hash, classification totals, approval mode, before/after line counts, sections rewritten, evidence paths, per-document validation outcomes, and reverted items. Then emit these fields in this order:

```text
Repaired: <n>
Relocated: <n>
Needs rework: <k>
Deferred: <m>
```

Follow with one line per deferred item in this exact form: `- deferred: <ruleId> <path> — <class>`. Preserve non-finding diagnostics verbatim under `Diagnostics`, including held owner-path failures. Count relocated clauses as §5 specifies and count only retained, validated edits in `<N>`.

End with exactly one terminal marker:

- `Enrich-docs complete: <N> files enriched` — evaluated work finished; any deferred or reverted items remain explicit in the report.
- `Enrich-docs dry-run complete` — the plan was displayed without writes.
- `Enrich-docs skipped: all RICH` — only RICH documents remain and no repair item exists.
- `Enrich-docs cancelled` — approval was declined, never a tool failure.
- `Enrich-docs failed: <reason>` — tool failure leaves no document evaluable after owner-path retries.
