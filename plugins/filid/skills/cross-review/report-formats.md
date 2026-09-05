# cross-review — Sealed Output Formats

`review_state({ action: "seal", ... })` computes the verdict and renders these artifacts. Read the returned paths and publish the rendered comment unchanged. This skill contains the output contract; no implementation module document is needed to interpret or deliver it. Angle-bracket values below are placeholders for sealed evidence.

## Verdict

Use the returned `summary.verdict`. Incomplete or untrusted evidence, a dirty worktree, pending coverage, reviewer gaps, or an indeterminate verifier or decision produce `INCONCLUSIVE`. Otherwise, confirmed findings produce `REQUEST_CHANGES`; with none, the result is `APPROVED`. Informational observations do not change the verdict. Never replace missing evidence with an approval or calculate a competing verdict in prose.

## Review report

`review-report.md` records the full evidence, including verdict-neutral observations. Preserve the metadata keys and section order:

```markdown
---
review_schema: 7
verdict: <APPROVED | REQUEST_CHANGES | INCONCLUSIVE>
branch: <branch>
base_ref: <base ref>
source_hash: <source hash>
snapshot_hash: <snapshot hash or unavailable>
files_total: <count>
files_reviewed: <count>
files_skipped: <count>
generated_at: <timestamp>
---

# Cross-Review — <branch>

## Scope

| Path           | Owner           |
| -------------- | --------------- |
| <changed path> | <owner fractal> |

## Evidence Status

| Field               | Value                          |
| ------------------- | ------------------------------ |
| source_hash         | <source hash>                  |
| snapshot_hash       | <snapshot hash or unavailable> |
| evidence_complete   | <true or false>                |
| structure_status    | <status>                       |
| verification_status | <status>                       |
| worktree            | <classification>               |

## Coverage

| Path   | Change   | Group   | Result                          | Reason   |
| ------ | -------- | ------- | ------------------------------- | -------- |
| <path> | <change> | <group> | <reviewed, skipped, or pending> | <reason> |

## Verification Log

| Candidate | Category   | Verdict                                | Evidence   | Reason   |
| --------- | ---------- | -------------------------------------- | ---------- | -------- |
| <ID>      | <category> | <CONFIRMED, REFUTED, or INDETERMINATE> | <evidence> | <reason> |

## Confirmed Findings

| ID   | Severity   | Category   | Path   | Rule   | Consequence   | Action   |
| ---- | ---------- | ---------- | ------ | ------ | ------------- | -------- |
| <ID> | <severity> | <category> | <path> | <rule> | <consequence> | <action> |

## Refuted Candidates

| ID   | Category   | Refuting Evidence | Reason   |
| ---- | ---------- | ----------------- | -------- |
| <ID> | <category> | <evidence>        | <reason> |

## Unresolved Evidence

| Source   | Path   | Rule   | Detail   | Affects Verdict |
| -------- | ------ | ------ | -------- | --------------- |
| <source> | <path> | <rule> | <detail> | <yes or no>     |

## Final Verdict

**<verdict>** — <reason derived from the sealed evidence>
```

An empty evidence table may render a `None` row. Findings retain their confirmed evidence; the orchestrator does not rewrite claims or add fixes during rendering.

At seal, the Verification Log records FCA candidates as `CONFIRMED` with `evidence.md#<id>` and `canonical structure evidence measured on snapshot <snapshotHash>`, and deterministically refuted findings outside the changed hunks as `REFUTED` with assigned hunk ranges and `finding lies outside the changed hunks`.

## PR comment

`pr-comment.md` summarizes the same sealed review. Use `## Code Review Governance` to find the existing comment for an update. Keep all three disclosure blocks, including empty ones; the unresolved block contains only evidence that affects the verdict.

```markdown
## Code Review Governance — <verdict>

| Field     | Value                                                       |
| --------- | ----------------------------------------------------------- |
| Verdict   | <verdict>                                                   |
| Branch    | `<branch>`                                                  |
| Base      | `<base ref>`                                                |
| Snapshot  | `<snapshot hash or unavailable>`                            |
| Coverage  | <count> reviewed · <count> skipped · <count> total          |
| Findings  | <count> confirmed · <count> refuted · <count> indeterminate |
| Generated | <timestamp>                                                 |

<details><summary>Confirmed findings (<count>)</summary>

<confirmed findings table, or None>

</details>

<details><summary>Coverage and verification log</summary>

### Coverage

<coverage table>

### Verification Log

<verification log table>

</details>

<details><summary>Unresolved evidence</summary>

<verdict-affecting unresolved evidence table, or None>

</details>

> Full report: `<returned reportPath>`
```

A sealed review remains valid if comment delivery fails. On a cached preparation, recover its paths through the idempotent seal action and retry publication without another reviewer round. Report publication status separately from the sealed verdict using the terminal output contract in [templates.md](./templates.md).
